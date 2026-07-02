"""
One-off cleanup for the Vapi account switch.

The platform moved to a new central Vapi account, so every stored Vapi resource
id (assistants, workflows, calls, synced tools) points at an account we no
longer use. Per owner decision the orphaned rows are deleted outright — users
and organizations are untouched.

Usage:
    python manage.py purge_vapi_orphans          # dry run, prints counts
    python manage.py purge_vapi_orphans --yes    # actually delete
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.studio.models import Agent, Call, CallEvent, NotionIntegration, Workflow


class Command(BaseCommand):
    help = "Delete rows referencing the old Vapi account (agents, workflows, calls; clears synced tool ids)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--yes",
            action="store_true",
            help="Perform the deletion. Without this flag the command is a dry run.",
        )

    def handle(self, *args, **options):
        agents = Agent.objects.count()
        workflows = Workflow.objects.count()
        calls = Call.objects.count()
        events = CallEvent.objects.count()
        integrations_with_tools = NotionIntegration.objects.exclude(vapi_tools=[]).count()

        self.stdout.write(f"Agents:                      {agents}")
        self.stdout.write(f"Workflows:                   {workflows}")
        self.stdout.write(f"Calls:                       {calls}")
        self.stdout.write(f"Call events:                 {events}")
        self.stdout.write(f"Integrations w/ synced tools: {integrations_with_tools}")

        if not options["yes"]:
            self.stdout.write(self.style.WARNING("Dry run — nothing deleted. Re-run with --yes."))
            return

        with transaction.atomic():
            # CallEvent cascades from Call.
            call_total, _ = Call.objects.all().delete()
            agent_total, _ = Agent.objects.all().delete()
            wf_total, _ = Workflow.objects.all().delete()
            # Integrations keep their tokens/mappings; only the old account's
            # synced Vapi tool ids are cleared so tools re-sync on next use.
            cleared = NotionIntegration.objects.exclude(vapi_tools=[]).update(vapi_tools=[])

        self.stdout.write(
            self.style.SUCCESS(
                f"Deleted {call_total} call rows (incl. events), {agent_total} agent rows, {wf_total} workflow rows."
            )
        )
        self.stdout.write(self.style.SUCCESS(f"Cleared vapi_tools on {cleared} integration(s)."))
        self.stdout.write(self.style.SUCCESS("Purge complete — platform is clean for the new Vapi account."))
