"""Shared pytest fixtures for Notion ↔ Vapi integration tests."""
from __future__ import annotations

import pytest

from apps.accounts.models import Organization
from apps.studio.models import NotionIntegration
from apps.studio.services.crypto import encrypt_str


@pytest.fixture
def organization(db):
    return Organization.objects.create(name="Test Org", slug="test-org")


@pytest.fixture
def notion_integration(organization):
    return NotionIntegration.objects.create(
        organization=organization,
        label="CRM",
        data_source_id="ds-test-123",
        database_id="db-test-456",
        field_mappings=[
            {
                "key": "name",
                "notionPropertyName": "Name",
                "notionType": "title",
            },
            {
                "key": "age",
                "notionPropertyName": "Age",
                "notionType": "number",
            },
        ],
        token_ciphertext=encrypt_str("secret-notion-token"),
        vapi_tools=[],
    )


@pytest.fixture
def vapi_tool_calls_payload():
    """Current Vapi documented tool-calls body."""
    return {
        "message": {
            "type": "tool-calls",
            "toolCallList": [
                {
                    "id": "toolu_test_abc",
                    "name": "notion_crm_save_row",
                    "arguments": {
                        "name": "Jane Doe",
                        "age": 30,
                    },
                }
            ],
        }
    }
