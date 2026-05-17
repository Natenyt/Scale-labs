"""
Build org-scoped metrics from Vapi analytics + call list aggregation.
"""
from __future__ import annotations

from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone as dt_timezone
from typing import Any

from apps.accounts.models import Organization
from apps.studio.models import Agent
from apps.studio.services import vapi as vapi_service
from apps.studio.services.vapi_call_access import (
    OrgVapiResourceIds,
    call_belongs_to_org,
    org_vapi_resource_ids,
)
from apps.studio.services.vapi_call_normalize import (
    _cost_amount,
    _customer_number,
    _duration_seconds,
    _parse_dt,
    _resolve_resource_name,
    friendly_call_type,
    friendly_ended_reason,
)

COST_SERIES_KEYS = [
    ("llm", "LLM", "costBreakdown.llm"),
    ("stt", "STT", "costBreakdown.stt"),
    ("tts", "TTS", "costBreakdown.tts"),
    ("platform", "Platform", "costBreakdown.vapi"),
]

FAILURE_ENDED_REASONS = frozenset(
    {
        "pipeline-error",
        "assistant-not-valid",
        "assistant-error",
        "assistant-did-not-receive-customer-audio",
        "vonage-failed-to-connect-call",
        "vonage-rejected",
        "phone-call-provider-closed-websocket",
        "call.in-progress.error",
    }
)


def _iso_z(dt: datetime) -> str:
    return dt.astimezone(dt_timezone.utc).isoformat().replace("+00:00", "Z")


def _time_range(days: int, step: str | None = None) -> dict[str, str]:
    end = datetime.now(dt_timezone.utc)
    start = end - timedelta(days=days)
    tr: dict[str, str] = {
        "start": _iso_z(start),
        "end": _iso_z(end),
        "timezone": "UTC",
    }
    if step:
        tr["step"] = step
    return tr


def _op(operation: str, column: str, alias: str) -> dict[str, str]:
    return {"operation": operation, "column": column, "alias": alias}


def _group_by(*fields: str) -> list[str]:
    """Vapi analytics expects groupBy as an array."""
    return list(fields)


def build_analytics_queries(days: int, step: str) -> list[dict[str, Any]]:
    tr = _time_range(days)
    tr_step = _time_range(days, step)

    queries: list[dict[str, Any]] = [
        {
            "name": "kpi_by_assistant",
            "table": "call",
            "groupBy": _group_by("assistantId"),
            "timeRange": tr,
            "operations": [
                _op("sum", "duration", "sumDuration"),
                _op("count", "id", "countId"),
                _op("sum", "cost", "sumCost"),
            ],
        },
        {
            "name": "spark_by_day",
            "table": "call",
            "groupBy": _group_by("assistantId"),
            "timeRange": tr_step,
            "operations": [
                _op("sum", "duration", "sumDuration"),
                _op("count", "id", "countId"),
                _op("sum", "cost", "sumCost"),
            ],
        },
        {
            "name": "duration_by_assistant",
            "table": "call",
            "groupBy": _group_by("assistantId"),
            "timeRange": tr_step,
            "operations": [_op("avg", "duration", "avgDuration")],
        },
        {
            "name": "ended_reason",
            "table": "call",
            "groupBy": _group_by("endedReason"),
            "timeRange": tr_step,
            "operations": [_op("count", "id", "countId")],
        },
        {
            "name": "calls_by_type",
            "table": "call",
            "groupBy": _group_by("type"),
            "timeRange": tr_step,
            "operations": [_op("count", "id", "countId")],
        },
        {
            "name": "avg_duration_series",
            "table": "call",
            "timeRange": tr_step,
            "operations": [_op("avg", "duration", "avgDuration")],
        },
        {
            "name": "cost_series",
            "table": "call",
            "timeRange": tr_step,
            "operations": [_op("sum", "cost", "sumCost")],
        },
        {
            "name": "success_eval",
            "table": "call",
            "groupBy": _group_by("analysis.successEvaluation"),
            "timeRange": tr_step,
            "operations": [_op("count", "id", "countId")],
        },
    ]

    for key, _label, column in COST_SERIES_KEYS:
        queries.append(
            {
                "name": f"cost_{key}",
                "table": "call",
                "timeRange": tr_step,
                "operations": [_op("sum", column, "sumCost")],
            }
        )

    queries.append(
        {
            "name": "concurrency",
            "table": "subscription",
            "timeRange": tr_step,
            "operations": [_op("max", "concurrency", "maxConcurrency")],
        }
    )
    return queries


def _results_by_name(raw: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    out: dict[str, list[dict[str, Any]]] = {}
    for block in raw:
        name = str(block.get("name") or "")
        result = block.get("result")
        if name and isinstance(result, list):
            out[name] = [r for r in result if isinstance(r, dict)]
    return out


def _num(row: dict[str, Any], *keys: str) -> float:
    for key in keys:
        v = row.get(key)
        if isinstance(v, (int, float)):
            return float(v)
    return 0.0


def _row_assistant_id(row: dict[str, Any]) -> str:
    return str(row.get("assistantId") or "").strip()


def _row_date(row: dict[str, Any]) -> str:
    d = row.get("date") or row.get("time") or row.get("bucket")
    return str(d or "")[:10]


def _allowed_assistant_ids(
    ids: OrgVapiResourceIds,
    *,
    filter_assistant_id: str | None,
) -> frozenset[str]:
    if filter_assistant_id:
        if filter_assistant_id in ids.assistant_ids:
            return frozenset({filter_assistant_id})
        return frozenset()
    return ids.assistant_ids


def _filter_assistant_rows(
    rows: list[dict[str, Any]],
    allowed: frozenset[str],
) -> list[dict[str, Any]]:
    if not allowed:
        return []
    out: list[dict[str, Any]] = []
    for row in rows:
        aid = _row_assistant_id(row)
        if aid:
            if aid in allowed:
                out.append(row)
        else:
            out.append(row)
    return out


def _format_money(value: float) -> str:
    return f"${value:.2f}"


def _format_minutes(seconds: float) -> str:
    return f"{seconds / 60:.2f}"


def _chart_series_meta(keys: list[tuple[str, str]]) -> list[dict[str, str]]:
    return [{"key": k, "label": label} for k, label in keys]


def _pivot_stacked(
    rows: list[dict[str, Any]],
    *,
    date_key: str = "date",
    category_field: str,
    value_keys: tuple[str, ...] = ("countId",),
    category_label: Any = None,
) -> tuple[list[dict[str, Any]], list[dict[str, str]]]:
    by_date: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    categories: dict[str, str] = {}

    for row in rows:
        date = _row_date(row) or str(row.get(date_key) or "")[:10]
        if not date:
            continue
        raw_cat = str(row.get(category_field) or "unknown").strip() or "unknown"
        cat_key = raw_cat.replace(".", "_").replace(" ", "_")
        if category_label:
            cat_label = category_label(raw_cat)
        else:
            cat_label = raw_cat
        categories[cat_key] = cat_label
        val = sum(_num(row, *value_keys) for _ in [0])
        by_date[date][cat_key] += val

    series = _chart_series_meta([(k, categories[k]) for k in sorted(categories)])
    data = []
    for date in sorted(by_date):
        point: dict[str, Any] = {"date": date}
        for s in series:
            point[s["key"]] = round(by_date[date].get(s["key"], 0), 4)
        data.append(point)
    return data, series


def _pivot_single_series(
    rows: list[dict[str, Any]],
    *,
    value_keys: tuple[str, ...],
    label: str,
    key: str = "value",
) -> tuple[list[dict[str, Any]], list[dict[str, str]]]:
    by_date: dict[str, float] = defaultdict(float)
    for row in rows:
        date = _row_date(row)
        if not date:
            continue
        by_date[date] += sum(_num(row, *value_keys) for _ in [0])
    data = [{"date": d, key: round(by_date[d], 4)} for d in sorted(by_date)]
    return data, [{"key": key, "label": label}]


def _aggregate_kpis_from_assistant_rows(
    rows: list[dict[str, Any]],
) -> dict[str, float]:
    total_duration = 0.0
    total_calls = 0.0
    total_cost = 0.0
    for row in rows:
        total_duration += _num(row, "sumDuration")
        total_calls += _num(row, "countId")
        total_cost += _num(row, "sumCost")
    avg_cost = total_cost / total_calls if total_calls > 0 else 0.0
    return {
        "totalMinutes": total_duration / 60.0,
        "callCount": total_calls,
        "totalCost": total_cost,
        "avgCost": avg_cost,
    }


def _sparklines_from_day_rows(
    rows: list[dict[str, Any]],
) -> dict[str, list[dict[str, Any]]]:
    minutes: dict[str, float] = defaultdict(float)
    calls: dict[str, float] = defaultdict(float)
    cost: dict[str, float] = defaultdict(float)
    for row in rows:
        date = _row_date(row)
        if not date:
            continue
        minutes[date] += _num(row, "sumDuration") / 60.0
        calls[date] += _num(row, "countId")
        cost[date] += _num(row, "sumCost")

    def _series(data: dict[str, float], key: str) -> list[dict[str, Any]]:
        return [{"date": d, key: round(data[d], 4)} for d in sorted(data)]

    return {
        "minutes": _series(minutes, "value"),
        "calls": _series(calls, "value"),
        "cost": _series(cost, "value"),
    }


def _assistant_name_map(organization: Organization) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for agent in Agent.objects.filter(organization=organization):
        vid = (agent.vapi_assistant_id or "").strip()
        if vid:
            mapping[vid] = (agent.name or "").strip() or f"Agent {agent.pk}"
    return mapping


def _duration_by_assistant_chart(
    rows: list[dict[str, Any]],
    names: dict[str, str],
) -> tuple[list[dict[str, Any]], list[dict[str, str]]]:
    by_date: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    cats: dict[str, str] = {}
    for row in rows:
        date = _row_date(row)
        aid = _row_assistant_id(row)
        if not date or not aid:
            continue
        key = aid.replace("-", "_")[:24]
        cats[key] = names.get(aid, "Unknown Assistant")
        by_date[date][key] += _num(row, "avgDuration") / 60.0

    series = _chart_series_meta([(k, cats[k]) for k in sorted(cats)])
    data = []
    for date in sorted(by_date):
        point: dict[str, Any] = {"date": date}
        for s in series:
            point[s["key"]] = round(by_date[date].get(s["key"], 0), 4)
        data.append(point)
    return data, series


def _cost_breakdown_chart(
    results: dict[str, list[dict[str, Any]]],
) -> tuple[list[dict[str, Any]], list[dict[str, str]]]:
    by_date: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    for key, _label, _col in COST_SERIES_KEYS:
        for row in results.get(f"cost_{key}", []):
            date = _row_date(row)
            if date:
                by_date[date][key] += _num(row, "sumCost")

    series = _chart_series_meta([(k, label) for k, label, _ in COST_SERIES_KEYS])
    data = []
    for date in sorted(by_date):
        point: dict[str, Any] = {"date": date}
        for s in series:
            point[s["key"]] = round(by_date[date].get(s["key"], 0), 4)
        data.append(point)
    return data, series


def _is_unsuccessful_call(call: dict[str, Any]) -> bool:
    status = str(call.get("status") or "").lower()
    if status in ("failed", "error", "ended", "ended-error"):
        if "fail" in status or "error" in status:
            return True
    reason = str(call.get("endedReason") or "")
    if reason in FAILURE_ENDED_REASONS or "error" in reason.lower():
        return True
    analysis = call.get("analysis")
    if isinstance(analysis, dict):
        ev = analysis.get("successEvaluation")
        if ev is False or str(ev).lower() == "false":
            return True
    return False


def _success_eval_label(raw: str) -> str:
    low = raw.lower()
    if low in ("true", "pass", "success"):
        return "Success"
    if low in ("false", "fail", "failure"):
        return "Failed"
    return "Unknown"


def _aggregate_from_calls(
    calls: list[dict[str, Any]],
    organization: Organization,
    step: str,
) -> dict[str, Any]:
    """Org-scoped chart data built from raw calls (accurate tenancy)."""
    if not calls:
        return {}

    def bucket_date(call: dict[str, Any]) -> str:
        dt = _parse_dt(call.get("startedAt") or call.get("createdAt"))
        if not dt:
            return ""
        if step == "week":
            iso = dt.isocalendar()
            return f"{iso.year}-W{iso.week:02d}"
        return dt.strftime("%Y-%m-%d")

    ended_rows: list[dict[str, Any]] = []
    type_rows: list[dict[str, Any]] = []
    success_rows: list[dict[str, Any]] = []
    cost_by_date: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    duration_by_date: dict[str, list[float]] = defaultdict(list)
    calls_by_date: dict[str, int] = defaultdict(int)

    for call in calls:
        date = bucket_date(call)
        if not date:
            continue
        calls_by_date[date] += 1
        dur = _duration_seconds(call)
        if dur is not None:
            duration_by_date[date].append(dur)

        reason = str(call.get("endedReason") or "unknown")
        ended_rows.append(
            {"date": date, "endedReason": reason, "countId": 1},
        )
        ctype = str(call.get("type") or "unknown")
        type_rows.append({"date": date, "type": ctype, "countId": 1})

        analysis = call.get("analysis")
        ev = "unknown"
        if isinstance(analysis, dict) and analysis.get("successEvaluation") is not None:
            ev = str(analysis.get("successEvaluation"))
        success_rows.append(
            {"date": date, "analysis.successEvaluation": ev, "countId": 1},
        )

        breakdown = call.get("costBreakdown")
        if isinstance(breakdown, list):
            for row in breakdown:
                if not isinstance(row, dict):
                    continue
                t = str(row.get("type") or "").lower()
                amt = row.get("cost")
                if not isinstance(amt, (int, float)):
                    continue
                if t in ("model", "llm"):
                    cost_by_date[date]["llm"] += float(amt)
                elif t == "transcriber":
                    cost_by_date[date]["stt"] += float(amt)
                elif t == "voice":
                    cost_by_date[date]["tts"] += float(amt)
                elif t == "vapi":
                    cost_by_date[date]["platform"] += float(amt)

    ended_data, ended_series = _pivot_stacked(
        ended_rows,
        category_field="endedReason",
        category_label=friendly_ended_reason,
    )
    type_data, type_series = _pivot_stacked(
        type_rows,
        category_field="type",
        category_label=lambda t: friendly_call_type(t),
    )
    success_data, success_series = _pivot_stacked(
        success_rows,
        category_field="analysis.successEvaluation",
        category_label=_success_eval_label,
    )

    cost_series = _chart_series_meta([(k, label) for k, label, _ in COST_SERIES_KEYS])
    cost_data = []
    for date in sorted(cost_by_date):
        point: dict[str, Any] = {"date": date}
        for s in cost_series:
            point[s["key"]] = round(cost_by_date[date].get(s["key"], 0), 4)
        cost_data.append(point)

    avg_duration_data = [
        {
            "date": d,
            "value": round(sum(duration_by_date[d]) / len(duration_by_date[d]) / 60.0, 4),
        }
        for d in sorted(duration_by_date)
        if duration_by_date[d]
    ]

    cost_total_data = []
    for call in calls:
        date = bucket_date(call)
        c = _cost_amount(call)
        if date and c is not None:
            found = next((p for p in cost_total_data if p["date"] == date), None)
            if found:
                found["value"] += c
            else:
                cost_total_data.append({"date": date, "value": c})
    for p in cost_total_data:
        p["value"] = round(p["value"], 4)
    cost_total_data.sort(key=lambda x: x["date"])

    calls_over_time = [
        {"date": d, "value": calls_by_date[d]} for d in sorted(calls_by_date)
    ]

    return {
        "endedReason": {"data": ended_data, "series": ended_series},
        "callsByType": {"data": type_data, "series": type_series},
        "successEval": {"data": success_data, "series": success_series},
        "costBreakdown": {"data": cost_data, "series": cost_series},
        "avgDuration": {
            "data": avg_duration_data,
            "series": [{"key": "value", "label": "Avg duration (min)"}],
        },
        "costOverTime": {
            "data": cost_total_data,
            "series": [{"key": "value", "label": "Cost ($)"}],
        },
        "callCount": {
            "data": calls_over_time,
            "series": [{"key": "value", "label": "Calls"}],
        },
    }


def empty_metrics_dashboard(*, days: int, step: str) -> dict[str, Any]:
    empty_chart = {"data": [], "series": []}
    return {
        "kpis": {
            "totalMinutes": 0,
            "totalMinutesLabel": "0.00",
            "callCount": 0,
            "callCountLabel": "0",
            "totalCost": 0,
            "totalCostLabel": "$0.00",
            "avgCost": 0,
            "avgCostLabel": "$0.00",
            "sparklines": {"minutes": [], "calls": [], "cost": []},
        },
        "charts": {
            "endedReason": empty_chart,
            "durationByAssistant": empty_chart,
            "costBreakdown": empty_chart,
            "callsByType": empty_chart,
            "avgDuration": empty_chart,
            "costOverTime": empty_chart,
            "successEval": empty_chart,
            "concurrency": empty_chart,
        },
        "unsuccessfulCalls": [],
        "meta": {"days": days, "step": step, "callsSampled": 0, "callsSampleLimit": 100},
    }


def build_metrics_dashboard(
    organization: Organization,
    *,
    days: int,
    step: str,
    filter_vapi_assistant_id: str | None = None,
) -> dict[str, Any]:
    ids = org_vapi_resource_ids(organization)
    allowed = _allowed_assistant_ids(ids, filter_assistant_id=filter_vapi_assistant_id)
    names = _assistant_name_map(organization)

    since = datetime.now(dt_timezone.utc) - timedelta(days=days)
    analytics_queries = build_analytics_queries(days, step)

    with ThreadPoolExecutor(max_workers=2) as executor:
        fut_calls = executor.submit(
            vapi_service.list_calls,
            createdAtGe=_iso_z(since),
            limit=100,
        )
        fut_analytics = executor.submit(
            vapi_service.post_analytics,
            analytics_queries,
        )
        raw_calls = fut_calls.result()
        analytics_raw = fut_analytics.result()

    org_calls = [c for c in raw_calls if call_belongs_to_org(c, ids)]
    if filter_vapi_assistant_id:
        org_calls = [
            c
            for c in org_calls
            if str(c.get("assistantId") or "").strip() == filter_vapi_assistant_id
        ]

    results = _results_by_name(analytics_raw)

    kpi_rows = _filter_assistant_rows(results.get("kpi_by_assistant", []), allowed)
    spark_rows = _filter_assistant_rows(results.get("spark_by_day", []), allowed)
    duration_rows = _filter_assistant_rows(
        results.get("duration_by_assistant", []),
        allowed,
    )

    kpis_raw = _aggregate_kpis_from_assistant_rows(kpi_rows)
    if kpis_raw["callCount"] == 0 and org_calls:
        total_dur = sum(_duration_seconds(c) or 0 for c in org_calls)
        total_cost = sum(_cost_amount(c) or 0 for c in org_calls)
        n = len(org_calls)
        kpis_raw = {
            "totalMinutes": total_dur / 60.0,
            "callCount": float(n),
            "totalCost": total_cost,
            "avgCost": total_cost / n if n else 0.0,
        }

    sparklines = _sparklines_from_day_rows(spark_rows)
    if not sparklines["calls"] and org_calls:
        call_agg = _aggregate_from_calls(org_calls, organization, step)
        sparklines = {
            "minutes": call_agg.get("avgDuration", {}).get("data", []),
            "calls": call_agg.get("callCount", {}).get("data", []),
            "cost": call_agg.get("costOverTime", {}).get("data", []),
        }

    call_charts = _aggregate_from_calls(org_calls, organization, step)

    duration_chart = _duration_by_assistant_chart(duration_rows, names)
    cost_breakdown_chart = _cost_breakdown_chart(results)

    concurrency_rows = results.get("concurrency", [])
    concurrency_data, concurrency_series = _pivot_single_series(
        concurrency_rows,
        value_keys=("maxConcurrency",),
        label="Concurrent calls",
        key="value",
    )

    unsuccessful: list[dict[str, Any]] = []
    for call in sorted(
        org_calls,
        key=lambda c: str(c.get("startedAt") or c.get("createdAt") or ""),
        reverse=True,
    ):
        if not _is_unsuccessful_call(call):
            continue
        assistant_id = str(call.get("assistantId") or "").strip()
        workflow_id = str(call.get("workflowId") or "").strip()
        unsuccessful.append(
            {
                "id": str(call.get("id") or ""),
                "resourceName": _resolve_resource_name(
                    organization,
                    assistant_id=assistant_id,
                    workflow_id=workflow_id,
                ),
                "startedAt": call.get("startedAt") or call.get("createdAt"),
                "customerNumber": _customer_number(call) or "No number",
                "statusLabel": "Failed",
            }
        )
        if len(unsuccessful) >= 10:
            break

    return {
        "kpis": {
            "totalMinutes": round(kpis_raw["totalMinutes"], 2),
            "totalMinutesLabel": _format_minutes(kpis_raw["totalMinutes"] * 60),
            "callCount": int(kpis_raw["callCount"]),
            "callCountLabel": str(int(kpis_raw["callCount"])),
            "totalCost": round(kpis_raw["totalCost"], 4),
            "totalCostLabel": _format_money(kpis_raw["totalCost"]),
            "avgCost": round(kpis_raw["avgCost"], 4),
            "avgCostLabel": _format_money(kpis_raw["avgCost"]),
            "sparklines": sparklines,
        },
        "charts": {
            "endedReason": call_charts.get("endedReason", {"data": [], "series": []}),
            "durationByAssistant": {
                "data": duration_chart[0],
                "series": duration_chart[1],
            },
            "costBreakdown": (
                call_charts.get("costBreakdown")
                if call_charts.get("costBreakdown", {}).get("data")
                else {"data": cost_breakdown_chart[0], "series": cost_breakdown_chart[1]}
            ),
            "callsByType": call_charts.get("callsByType", {"data": [], "series": []}),
            "avgDuration": call_charts.get("avgDuration", {"data": [], "series": []}),
            "costOverTime": call_charts.get("costOverTime", {"data": [], "series": []}),
            "successEval": call_charts.get("successEval", {"data": [], "series": []}),
            "concurrency": {"data": concurrency_data, "series": concurrency_series},
        },
        "unsuccessfulCalls": unsuccessful,
        "meta": {
            "days": days,
            "step": step,
            "callsSampled": len(org_calls),
            "callsSampleLimit": 100,
        },
    }
