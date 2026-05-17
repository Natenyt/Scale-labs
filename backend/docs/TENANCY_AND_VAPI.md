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

- **Backend:** `VAPI_API_KEY`, `VAPI_PUBLIC_KEY`, `VAPI_WEBHOOK_BASE`, `DEV_PUBLIC_ORIGIN`, `VAPI_SHARED_SECRET`
- **Frontend:** `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_VAPI_PUBLIC_KEY` (browser Web SDK only)

Do not put `VAPI_API_KEY` in the Next.js app.

## Vapi tool webhooks (Notion integrations)

When you sync Notion tools, each Vapi function tool gets a **Server URL** like:

`https://<public-host>/api/v1/webhooks/vapi/notion/<integration-id>/save/`

Vapi invokes that URL from the cloud when an agent calls the tool. **`localhost` does not work.**

Resolution order (`config/vapi_webhook.py`):

1. `VAPI_WEBHOOK_BASE` if it is a public https URL (production or **backend** ngrok)
2. Else `DEV_PUBLIC_ORIGIN` (single-tunnel: ngrok on port **3000** only; Next proxies `/api/v1/*`)

Re-sync tools after changing these env vars so Vapi dashboard URLs update.

## Local development (ports)

| Service | Port | ngrok command |
|---------|------|----------------|
| Django API | **8000** | `ngrok http 8000` → set `VAPI_WEBHOOK_BASE` |
| Next.js UI | **3000** | `ngrok http 3000` → set `DEV_PUBLIC_ORIGIN` + `NEXT_PUBLIC_DEV_ORIGIN` |

**Split tunnels (recommended when UI and API have different ngrok URLs):**

- `backend/.env`: `VAPI_WEBHOOK_BASE=https://<backend-tunnel>` (port 8000)
- `backend/.env`: `DEV_PUBLIC_ORIGIN=https://<frontend-tunnel>` (port 3000, CORS)
- `frontend/.env.local`: `NEXT_PUBLIC_DEV_ORIGIN` and `NEXT_PUBLIC_API_BASE_URL` = frontend tunnel (same origin; Next proxies API to localhost:8000)

**Single tunnel:** one ngrok on 3000, leave `VAPI_WEBHOOK_BASE` empty; webhooks use `DEV_PUBLIC_ORIGIN` via the Next proxy.

Set in `backend/.env`:

- `VAPI_API_KEY` — required to create agents and sync assistants
- `VAPI_PUBLIC_KEY` — required for browser voice (`GET/POST /api/v1/calls/...`)
- `VAPI_SHARED_SECRET` — required for Notion tool webhooks
- `VAPI_WEBHOOK_BASE` — public URL Vapi calls for tool webhooks (backend ngrok or production)
- `DEV_PUBLIC_ORIGIN` — frontend ngrok URL for browser CORS (not used for webhooks when `VAPI_WEBHOOK_BASE` is set)
- `CORS_ALLOWED_ORIGINS` — must include your Next.js origin (e.g. `http://localhost:3000`)
- Django allows `X-Org-Id` via `CORS_ALLOW_HEADERS` in `config/settings/base.py` (required for agent/workflow APIs)

Frontend: `NEXT_PUBLIC_API_BASE_URL` should match how you open the UI (frontend ngrok or localhost).

## Limitation

All orgs share one Vapi account. Isolation is enforced in Django, not inside Vapi’s dashboard. Proxy endpoints must verify that a Vapi resource id belongs to the caller’s org before calling Vapi.
