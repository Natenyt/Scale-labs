"""Re-sync agents' Vapi assistants from their stored config.

Used after payload-builder changes (e.g. the Yandex bridge port) so existing
agents pick up the new voice/transcriber without waiting for a user edit.

Usage:
    python manage.py resync_agents --language uz ru      # bridge languages
    python manage.py resync_agents --all                 # every agent
"""
from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from apps.studio.models import Agent
from apps.studio.services import vapi
from apps.studio.services.agent_assistant import build_vapi_assistant_payload


class Command(BaseCommand):
    help = "Re-push Vapi assistant payloads for agents (by language, or all)."

    def add_arguments(self, parser):
        parser.add_argument("--language", nargs="*", default=None)
        parser.add_argument("--all", action="store_true")

    def handle(self, *args, **options):
        if not options["all"] and not options["language"]:
            raise CommandError("Pass --language <codes...> or --all")

        agents = Agent.objects.all()
        synced = skipped = failed = 0
        for agent in agents:
            lang = str((agent.config or {}).get("language") or "en").strip().lower()
            if not options["all"] and lang not in (options["language"] or []):
                continue

            payload = build_vapi_assistant_payload(agent.name, agent.config or {})
            try:
                if agent.vapi_assistant_id:
                    vapi.update_assistant(agent.vapi_assistant_id, payload)
                else:
                    created = vapi.create_assistant(payload)
                    agent.vapi_assistant_id = str(created.get("id") or "")
                    agent.save(update_fields=["vapi_assistant_id", "updated_at"])
                synced += 1
                self.stdout.write(f"  synced {agent.pk} ({lang}) {agent.name}")
            except vapi.VapiApiError as exc:
                failed += 1
                self.stderr.write(f"  FAILED {agent.pk} {agent.name}: {exc}")

        self.stdout.write(
            self.style.SUCCESS(f"Done: {synced} synced, {failed} failed, {skipped} skipped.")
        )
