"""Unit tests for Vapi tool-call payload parsing."""
from __future__ import annotations

import json

import pytest

from apps.studio.services.notion_webhook_handlers import parse_tool_call


def test_parse_tool_call_list_current_vapi_format():
    body = {
        "message": {
            "type": "tool-calls",
            "toolCallList": [
                {
                    "id": "toolu_01",
                    "name": "notion_crm_save_row",
                    "arguments": {"name": "Alice", "age": 25},
                }
            ],
        }
    }
    parsed = parse_tool_call(body)
    assert parsed is not None
    tool_call_id, args = parsed
    assert tool_call_id == "toolu_01"
    assert args == {"name": "Alice", "age": 25}


def test_parse_legacy_tool_calls_with_function_arguments_string():
    body = {
        "message": {
            "toolCalls": [
                {
                    "id": "call_legacy",
                    "function": {
                        "name": "notion_crm_save_row",
                        "arguments": json.dumps({"name": "Bob"}),
                    },
                }
            ],
        }
    }
    parsed = parse_tool_call(body)
    assert parsed is not None
    tool_call_id, args = parsed
    assert tool_call_id == "call_legacy"
    assert args == {"name": "Bob"}


def test_parse_tool_with_tool_call_list_nested_parameters():
    body = {
        "message": {
            "type": "tool-calls",
            "toolWithToolCallList": [
                {
                    "toolCall": {
                        "id": "nested_1",
                        "function": {
                            "name": "save",
                            "parameters": {"name": "Carol"},
                        },
                    }
                }
            ],
        }
    }
    parsed = parse_tool_call(body)
    assert parsed is not None
    tool_call_id, args = parsed
    assert tool_call_id == "nested_1"
    assert args == {"name": "Carol"}


def test_parse_returns_none_for_empty_message():
    assert parse_tool_call({}) is None
    assert parse_tool_call({"message": {}}) is None
