"""Create PhoneNumber ownership rows for existing Vapi numbers.

Numbers created before the ownership model have no row and fall back to the
legacy visibility heuristic (unassigned = visible to every org). This assigns
them explicitly to one organization.

Usage:
    python manage.py backfill_phone_numbers --org <org id or slug>
    python manage.py backfill_phone_numbers --org 1 --yes
"""
from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from apps.accounts.models import Organization
from apps.studio.models import PhoneNumber
from apps.studio.services import vapi


class Command(BaseCommand):
    help = "Assign unowned Vapi phone numbers to an organization."

    def add_arguments(self, parser):
        parser.add_argument("--org", required=True, help="Organization id or slug")
        parser.add_argument("--yes", action="store_true", help="Write rows (else dry run)")

    def handle(self, *args, **options):
        ref = str(options["org"]).strip()
        org = (
            Organization.objects.filter(pk=ref).first()
            if ref.isdigit()
            else Organization.objects.filter(slug=ref).first()
        )
        if not org:
            raise CommandError(f"Organization {ref!r} not found")

        rows = vapi.list_phone_numbers()
        owned = set(
            PhoneNumber.objects.values_list("vapi_phone_number_id", flat=True)
        )
        unowned = [r for r in rows if str(r.get("id") or "").strip() not in owned]

        for r in unowned:
            self.stdout.write(
                f"  {r.get('id')}  {r.get('number') or '(no number)'}  provider={r.get('provider')}"
            )
        if not unowned:
            self.stdout.write(self.style.SUCCESS("Nothing to backfill."))
            return
        if not options["yes"]:
            self.stdout.write(
                self.style.WARNING(
                    f"Dry run — would assign {len(unowned)} number(s) to '{org.name}'. Re-run with --yes."
                )
            )
            return

        created = 0
        for r in unowned:
            vapi_id = str(r.get("id") or "").strip()
            if not vapi_id:
                continue
            PhoneNumber.objects.update_or_create(
                vapi_phone_number_id=vapi_id,
                defaults={
                    "organization": org,
                    "number": str(r.get("number") or ""),
                    "provider": str(r.get("provider") or ""),
                    "name": str(r.get("name") or ""),
                },
            )
            created += 1
        self.stdout.write(
            self.style.SUCCESS(f"Assigned {created} number(s) to '{org.name}'.")
        )
