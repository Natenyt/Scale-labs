"""Resolve a squad canvas graph into a Vapi squad payload.

Ported from the proven ScaleOps implementation (scale-labs-ops
src/lib/flows/config.ts + squads/actions.ts). Invariants that must survive:

- The start member is emitted FIRST in ``members`` (it answers the call).
- A node's outgoing edges become that member's ``assistantDestinations``,
  routed by the TARGET's assistant NAME (Vapi routes handoffs by name).
- The destinations key is omitted entirely for terminal members.
- Agent names must be distinct within a squad (case-insensitive) because
  handoff routes by name.
- Never trust client-supplied names/vapi ids: members resolve from the org's
  Agent rows by ``ag_<pk>`` id.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from apps.accounts.models import Organization
from apps.studio.models import Agent
from apps.studio.serializers import _parse_ext_id


class SquadGraphError(ValueError):
    """Invalid squad graph (message is user-facing)."""


@dataclass(frozen=True)
class ResolvedNode:
    node_id: str
    agent_pk: int
    agent_ext_id: str
    agent_name: str
    vapi_assistant_id: str
    position: dict[str, Any]
    is_start: bool


def resolve_graph(
    organization: Organization,
    graph: dict[str, Any],
) -> tuple[list[ResolvedNode], list[dict[str, Any]]]:
    """Validate the canvas graph and resolve nodes to org-owned agents."""
    raw_nodes = [n for n in (graph.get("nodes") or []) if isinstance(n, dict)]
    raw_edges = [e for e in (graph.get("edges") or []) if isinstance(e, dict)]

    nodes_in = [n for n in raw_nodes if str(n.get("agentId") or "").strip()]
    if len(nodes_in) < 2:
        raise SquadGraphError("Add at least two agents to the canvas.")
    if not raw_edges:
        raise SquadGraphError("Connect the agents so at least one handoff exists.")

    # Resolve agents by ag_<pk> under the org (authoritative name + vapi id).
    pks: dict[str, int] = {}
    for n in nodes_in:
        ext = str(n.get("agentId")).strip()
        pk = _parse_ext_id("ag", ext)
        if pk is None:
            raise SquadGraphError(f"Invalid agent id {ext!r}.")
        pks[ext] = pk

    agents = {
        a.pk: a
        for a in Agent.objects.filter(organization=organization, pk__in=set(pks.values()))
    }

    resolved: list[ResolvedNode] = []
    for n in nodes_in:
        ext = str(n.get("agentId")).strip()
        agent = agents.get(pks[ext])
        if not agent:
            raise SquadGraphError("One or more selected agents no longer exist.")
        vid = (agent.vapi_assistant_id or "").strip()
        if not vid:
            raise SquadGraphError(
                f"Agent “{agent.name}” is not linked to voice yet. Save or sync it first.",
            )
        position = n.get("position") if isinstance(n.get("position"), dict) else {"x": 0, "y": 0}
        resolved.append(
            ResolvedNode(
                node_id=str(n.get("id") or "").strip(),
                agent_pk=agent.pk,
                agent_ext_id=ext,
                agent_name=agent.name,
                vapi_assistant_id=vid,
                position=position,
                is_start=bool(n.get("isStart")),
            )
        )

    names = [r.agent_name.strip().lower() for r in resolved]
    if len(set(names)) != len(names):
        raise SquadGraphError(
            "Each agent on the canvas must have a distinct name — handoff routes by name.",
        )

    node_ids = {r.node_id for r in resolved}
    edges = [
        {
            "id": str(e.get("id") or "").strip(),
            "source": str(e.get("source") or "").strip(),
            "target": str(e.get("target") or "").strip(),
            "condition": str(e.get("condition") or "").strip(),
        }
        for e in raw_edges
        if str(e.get("source") or "").strip() in node_ids
        and str(e.get("target") or "").strip() in node_ids
    ]
    if not edges:
        raise SquadGraphError("Connect the agents so at least one handoff exists.")

    return resolved, edges


def build_vapi_squad(
    name: str,
    nodes: list[ResolvedNode],
    edges: list[dict[str, Any]],
) -> dict[str, Any]:
    """Compile the resolved graph into a Vapi POST/PATCH /squad payload."""
    by_id = {n.node_id: n for n in nodes}
    start = next((n for n in nodes if n.is_start), nodes[0])
    ordered = [start, *[n for n in nodes if n.node_id != start.node_id]]

    members: list[dict[str, Any]] = []
    for n in ordered:
        destinations = []
        for e in edges:
            if e["source"] != n.node_id:
                continue
            target = by_id.get(e["target"])
            if not target:
                continue
            destinations.append(
                {
                    "type": "assistant",
                    "assistantName": target.agent_name,
                    "message": "",
                    "description": e["condition"]
                    or f"Hand off to {target.agent_name}.",
                }
            )
        member: dict[str, Any] = {"assistantId": n.vapi_assistant_id}
        if destinations:
            member["assistantDestinations"] = destinations
        members.append(member)

    return {"name": name, "members": members}


def normalized_graph(
    nodes: list[ResolvedNode],
    edges: list[dict[str, Any]],
) -> dict[str, Any]:
    """The graph as persisted on the Squad row (authoritative snapshot)."""
    return {
        "nodes": [
            {
                "id": n.node_id,
                "agentId": n.agent_ext_id,
                "agentName": n.agent_name,
                "vapiAssistantId": n.vapi_assistant_id,
                "position": n.position,
                "isStart": n.is_start,
            }
            for n in nodes
        ],
        "edges": edges,
    }
