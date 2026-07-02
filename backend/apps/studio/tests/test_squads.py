"""Squad builder + API tests (graph → Vapi squad compilation, org scoping)."""
from __future__ import annotations

from unittest.mock import patch

import pytest
from django.test import Client
from rest_framework_simplejwt.tokens import AccessToken

from apps.accounts.models import Organization, OrganizationMembership
from apps.studio.models import Agent, Squad
from apps.studio.services.squad_builder import (
    SquadGraphError,
    build_vapi_squad,
    resolve_graph,
)


@pytest.fixture
def org(db):
    return Organization.objects.create(name="Squad Org", slug="squad-org")


@pytest.fixture
def agents(org):
    a = Agent.objects.create(
        organization=org, name="Reception", vapi_assistant_id="asst-a", config={}
    )
    b = Agent.objects.create(
        organization=org, name="Booking", vapi_assistant_id="asst-b", config={}
    )
    return a, b


def graph_for(a, b, *, condition="Caller wants to book"):
    return {
        "nodes": [
            {"id": "n1", "agentId": f"ag_{a.pk}", "position": {"x": 0, "y": 0}, "isStart": True},
            {"id": "n2", "agentId": f"ag_{b.pk}", "position": {"x": 300, "y": 0}},
        ],
        "edges": [{"id": "e1", "source": "n1", "target": "n2", "condition": condition}],
    }


# --- builder ------------------------------------------------------------------


def test_build_vapi_squad_start_first_and_name_keyed_destinations(org, agents):
    a, b = agents
    nodes, edges = resolve_graph(org, graph_for(a, b))
    payload = build_vapi_squad("Flow", nodes, edges)

    assert payload["name"] == "Flow"
    members = payload["members"]
    assert [m["assistantId"] for m in members] == ["asst-a", "asst-b"]
    assert members[0]["assistantDestinations"] == [
        {
            "type": "assistant",
            "assistantName": "Booking",
            "message": "",
            "description": "Caller wants to book",
        }
    ]
    # Terminal member: destinations key omitted entirely.
    assert "assistantDestinations" not in members[1]


def test_start_flag_reorders_members(org, agents):
    a, b = agents
    g = graph_for(a, b)
    g["nodes"][0]["isStart"] = False
    g["nodes"][1]["isStart"] = True
    nodes, edges = resolve_graph(org, g)
    payload = build_vapi_squad("Flow", nodes, edges)
    assert payload["members"][0]["assistantId"] == "asst-b"


def test_empty_condition_gets_default_description(org, agents):
    a, b = agents
    nodes, edges = resolve_graph(org, graph_for(a, b, condition=""))
    payload = build_vapi_squad("Flow", nodes, edges)
    dest = payload["members"][0]["assistantDestinations"][0]
    assert dest["description"] == "Hand off to Booking."


def test_requires_two_nodes_and_one_edge(org, agents):
    a, _b = agents
    with pytest.raises(SquadGraphError, match="at least two agents"):
        resolve_graph(org, {"nodes": [{"id": "n1", "agentId": f"ag_{a.pk}"}], "edges": []})


def test_distinct_names_required(org, agents):
    a, b = agents
    b.name = "reception"  # case-insensitive clash with "Reception"
    b.save(update_fields=["name"])
    with pytest.raises(SquadGraphError, match="distinct name"):
        resolve_graph(org, graph_for(a, b))


def test_cross_org_agent_rejected(org, agents, db):
    a, _b = agents
    other = Organization.objects.create(name="Other", slug="other-org")
    foreign = Agent.objects.create(
        organization=other, name="Foreign", vapi_assistant_id="asst-x", config={}
    )
    g = graph_for(a, foreign)
    with pytest.raises(SquadGraphError, match="no longer exist"):
        resolve_graph(org, g)


def test_unsynced_agent_rejected(org, agents):
    a, b = agents
    b.vapi_assistant_id = ""
    b.save(update_fields=["vapi_assistant_id"])
    with pytest.raises(SquadGraphError, match="not linked to voice"):
        resolve_graph(org, graph_for(a, b))


# --- API ----------------------------------------------------------------------


@pytest.fixture
def auth_client(org):
    from django.contrib.auth import get_user_model

    user = get_user_model().objects.create_user(
        email="squaduser@example.com", password="pass"
    )
    OrganizationMembership.objects.create(user=user, organization=org, role="owner")
    client = Client()
    token = AccessToken.for_user(user)
    client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {token}"
    client.defaults["HTTP_X_ORG_ID"] = str(org.pk)
    return client


@patch("apps.studio.views.vapi_service.create_squad")
def test_create_squad_vapi_first_and_snapshot(mock_create, auth_client, org, agents):
    a, b = agents
    mock_create.return_value = {"id": "sq-vapi-1"}
    res = auth_client.post(
        "/api/v1/squads/",
        {"name": "Reception flow", "graph": graph_for(a, b)},
        content_type="application/json",
    )
    assert res.status_code == 201, res.json()
    data = res.json()
    assert data["vapi_squad_id"] == "sq-vapi-1"
    assert data["id"].startswith("sq_")
    # Snapshot enriched with authoritative names/vapi ids.
    node = data["graph"]["nodes"][0]
    assert node["agentName"] == "Reception"
    assert node["vapiAssistantId"] == "asst-a"
    # Payload sent to Vapi had start-first members.
    sent = mock_create.call_args[0][0]
    assert sent["members"][0]["assistantId"] == "asst-a"


@patch("apps.studio.views.vapi_service.create_squad")
def test_create_squad_invalid_graph_400_and_no_vapi_call(mock_create, auth_client, org, agents):
    a, _b = agents
    res = auth_client.post(
        "/api/v1/squads/",
        {"name": "Bad", "graph": {"nodes": [{"id": "n1", "agentId": f"ag_{a.pk}"}], "edges": []}},
        content_type="application/json",
    )
    assert res.status_code == 400
    mock_create.assert_not_called()


@patch("apps.studio.views.vapi_service.delete_squad")
def test_delete_squad_best_effort_remote(mock_delete, auth_client, org, agents):
    squad = Squad.objects.create(
        organization=org, name="Doomed", vapi_squad_id="sq-vapi-9", graph={}
    )
    res = auth_client.delete(f"/api/v1/squads/sq_{squad.pk}/")
    assert res.status_code == 204
    mock_delete.assert_called_once_with("sq-vapi-9")
    assert not Squad.objects.filter(pk=squad.pk).exists()


def test_squads_are_org_scoped(auth_client, db):
    other = Organization.objects.create(name="Other2", slug="other-2")
    Squad.objects.create(organization=other, name="Hidden", graph={})
    res = auth_client.get("/api/v1/squads/")
    assert res.status_code == 200
    assert res.json() == []
