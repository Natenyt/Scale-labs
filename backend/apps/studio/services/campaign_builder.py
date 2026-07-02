"""Compile a campaign into a Vapi POST /campaign payload + parse recipients.

Ported from the proven ScaleOps implementation (scale-labs-ops
src/lib/campaigns/config.ts). Invariants:

- E.164 validation regex ``^\\+[1-9]\\d{7,14}$`` for every customer number.
- assistantId XOR squadId (mutually exclusive target).
- schedulePlan.earliestAt only included when a start time is provided.
- Deduplicate customers by number (first wins).
- Vapi's PATCH accepts only {status: "ended"} — no generic edit.
"""
from __future__ import annotations

import re
from typing import Any

E164 = re.compile(r"^\+[1-9]\d{7,14}$")

# CSV header column names that mean "phone number".
_NUMBER_ALIASES = {"number", "phone", "phone_number", "phonenumber", "mobile"}


def dedupe(customers: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    out: list[dict[str, Any]] = []
    for c in customers:
        num = c["number"]
        if num in seen:
            continue
        seen.add(num)
        out.append(c)
    return out


def validate_customers(customers: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[str]]:
    """Filter to valid E.164 numbers, returning (valid, invalid-raw)."""
    valid: list[dict[str, Any]] = []
    invalid: list[str] = []
    for c in customers or []:
        num = str((c or {}).get("number") or "").strip()
        if not E164.match(num):
            invalid.append(num or str(c))
            continue
        name = str((c or {}).get("name") or "").strip()
        valid.append({"number": num, "name": name} if name else {"number": num})
    return dedupe(valid), invalid


def parse_customers_csv(text: str) -> tuple[list[dict[str, Any]], list[str]]:
    """Header-tolerant CSV → customers. Finds a number/phone column + name."""
    rows = [r.strip() for r in re.split(r"\r?\n", text or "") if r.strip()]
    if not rows:
        return [], []

    def split(r: str) -> list[str]:
        return [c.strip().strip('"') for c in r.split(",")]

    number_idx = 0
    name_idx = -1
    start = 0
    header = [h.lower() for h in split(rows[0])]
    if any(h in _NUMBER_ALIASES or h == "name" for h in header):
        start = 1
        number_idx = next(
            (i for i, h in enumerate(header) if h in _NUMBER_ALIASES), 0
        )
        name_idx = next((i for i, h in enumerate(header) if h == "name"), -1)

    parsed: list[dict[str, Any]] = []
    for r in rows[start:]:
        cols = split(r)
        number = cols[number_idx] if number_idx < len(cols) else ""
        name = cols[name_idx] if 0 <= name_idx < len(cols) else ""
        parsed.append({"number": number, "name": name})
    return validate_customers(parsed)


def build_vapi_campaign(
    *,
    name: str,
    vapi_phone_number_id: str,
    assistant_id: str | None = None,
    squad_id: str | None = None,
    customers: list[dict[str, Any]],
    schedule_earliest_at: str | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "name": name,
        "phoneNumberId": vapi_phone_number_id,
        "customers": [
            {"number": c["number"], "name": c["name"]}
            if c.get("name")
            else {"number": c["number"]}
            for c in customers
        ],
    }
    if assistant_id:
        payload["assistantId"] = assistant_id
    elif squad_id:
        payload["squadId"] = squad_id
    if schedule_earliest_at:
        payload["schedulePlan"] = {"earliestAt": schedule_earliest_at}
    return payload
