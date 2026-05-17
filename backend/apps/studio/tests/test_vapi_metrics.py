"""Unit tests for metrics normalization."""
from __future__ import annotations

from apps.studio.services.vapi_metrics import (
    build_analytics_queries,
    _aggregate_kpis_from_assistant_rows,
    _filter_assistant_rows,
    _pivot_stacked,
    _results_by_name,
)


def test_analytics_queries_use_group_by_array():
    queries = build_analytics_queries(7, "day")
    grouped = [q for q in queries if "groupBy" in q]
    assert grouped
    for q in grouped:
        assert isinstance(q["groupBy"], list)
        assert len(q["groupBy"]) >= 1


def test_filter_assistant_rows():
    rows = [
        {"assistantId": "a1", "countId": 5},
        {"assistantId": "a2", "countId": 3},
        {"date": "2026-05-16", "countId": 1},
    ]
    filtered = _filter_assistant_rows(rows, frozenset({"a1"}))
    assert len(filtered) == 2
    assert sum(r.get("countId", 0) for r in filtered if r.get("assistantId") == "a1") == 5


def test_aggregate_kpis_from_assistant_rows():
    rows = [
        {"sumDuration": 120, "countId": 2, "sumCost": 0.1},
        {"sumDuration": 60, "countId": 1, "sumCost": 0.05},
    ]
    kpis = _aggregate_kpis_from_assistant_rows(rows)
    assert kpis["callCount"] == 3
    assert kpis["totalMinutes"] == 3.0
    assert round(kpis["totalCost"], 2) == 0.15


def test_pivot_stacked_ended_reason():
    rows = [
        {"date": "2026-05-16", "endedReason": "customer-ended-call", "countId": 2},
        {"date": "2026-05-16", "endedReason": "pipeline-error", "countId": 1},
        {"date": "2026-05-17", "endedReason": "customer-ended-call", "countId": 1},
    ]
    data, series = _pivot_stacked(
        rows,
        category_field="endedReason",
        category_label=lambda r: r.replace("-", " ").title(),
    )
    assert len(data) == 2
    assert len(series) >= 2
    assert data[0]["date"] == "2026-05-16"


def test_results_by_name():
    raw = [
        {"name": "kpi_by_assistant", "result": [{"assistantId": "a1", "countId": 1}]},
        {"name": "spark_by_day", "result": []},
    ]
    mapped = _results_by_name(raw)
    assert "kpi_by_assistant" in mapped
    assert len(mapped["kpi_by_assistant"]) == 1
