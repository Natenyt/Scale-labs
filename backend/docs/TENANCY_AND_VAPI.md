# Organization tenancy and Vapi

Scale Labs uses **one platform Vapi account** (`VAPI_API_KEY` in backend env only). End users never provide a Vapi API key.

## Tenant boundary

The tenant is an **Organization**, not an individual user. Users belong to orgs via `OrganizationMembership`. All studio resources are scoped with `organization_id`:

| Model | Vapi id field |
|-------|----------------|
| `Agent` | `vapi_assistant_id` |
| `Workflow` | `vapi_workflow_id` |
| `NotionIntegration` | `vapi_tools[]` (per-tool `id`) |
| `Call` | `vapi_call_id` |

## Request flow

1. Browser sends `Authorization: Bearer <JWT>` and `X-Org-Id: <org pk>`.
2. `ActiveOrganizationMiddleware` sets `request.organization` (member check).
3. ViewSets filter `get_queryset()` by `request.organization`.
4. Vapi calls use `settings.VAPI_API_KEY`; returned Vapi ids are stored on the org’s row.

## Frontend env

- **Backend:** `VAPI_API_KEY`, `VAPI_PUBLIC_KEY`, `VAPI_WEBHOOK_BASE`, `VAPI_SHARED_SECRET`
- **Frontend:** `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_VAPI_PUBLIC_KEY` (browser Web SDK only)

Do not put `VAPI_API_KEY` in the Next.js app.

## Local development

Set in `backend/.env`:

- `VAPI_API_KEY` — required to create agents and sync assistants
- `VAPI_PUBLIC_KEY` — required for browser voice (`GET/POST /api/v1/calls/...`)
- `CORS_ALLOWED_ORIGINS` — must include your Next.js origin (e.g. `http://localhost:3000`)
- Django allows `X-Org-Id` via `CORS_ALLOW_HEADERS` in `config/settings/base.py` (required for agent/workflow APIs)

Frontend: `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000` (same hostname style as CORS).

## Limitation

All orgs share one Vapi account. Isolation is enforced in Django, not inside Vapi’s dashboard. Proxy endpoints must verify that a Vapi resource id belongs to the caller’s org before calling Vapi.
