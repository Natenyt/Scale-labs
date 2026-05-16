import { NextResponse } from "next/server";

import {
  buildNotionToolPayloads,
  type BuiltTool,
} from "@/lib/integrations/notion/tool-builder";
import type {
  NotionIntegration,
  NotionToolKind,
  VapiToolRef,
} from "@/lib/integrations/types";
import {
  createTool,
  deleteTool,
  requireSharedSecret,
  requireWebhookBase,
  toVapiRouteError,
  updateTool,
  type VapiToolResponse,
} from "@/lib/vapi/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

/**
 * POST /api/integrations/notion/[id]/sync-tools
 *
 * Body: full `NotionIntegration` JSON (the store lives in localStorage during
 * MVP, so the client ships the record we should sync). Returns the freshly
 * updated `vapiTools[]` for the integration.
 *
 * Behaviour:
 *   - For each of the 5 tool kinds, PATCH if we already have a Vapi id for
 *     that kind, otherwise POST a new tool.
 *   - We aim for idempotency: re-syncing always converges, no orphans get
 *     created. (Orphans from older syncs are not auto-cleaned here.)
 *   - Errors from individual tool calls are collected; we return 207-like
 *     mixed results so the client can decide whether to mark the whole
 *     integration as `error`.
 */
export async function POST(req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const webhookBase = requireWebhookBase();
    const sharedSecret = requireSharedSecret();

    const integration = (await req.json()) as NotionIntegration;
    if (!integration || integration.id !== id) {
      return NextResponse.json(
        { error: "Body integration.id must match the route id" },
        { status: 400 },
      );
    }
    if (integration.kind !== "notion") {
      return NextResponse.json(
        { error: "Only Notion integrations are supported here" },
        { status: 400 },
      );
    }

    const built = buildNotionToolPayloads(integration, {
      webhookBase,
      sharedSecret,
    });

    const existing = new Map<NotionToolKind, VapiToolRef>();
    for (const t of integration.vapiTools ?? []) existing.set(t.kind, t);

    const results: VapiToolRef[] = [];
    const errors: { kind: NotionToolKind; error: string }[] = [];

    for (const tool of built) {
      try {
        const ref = await syncOne(tool, existing.get(tool.kind));
        results.push(ref);
      } catch (err) {
        errors.push({
          kind: tool.kind,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      ok: errors.length === 0,
      vapiTools: results,
      errors,
    });
  } catch (err) {
    const { status, body } = toVapiRouteError(err);
    return NextResponse.json(body, { status });
  }
}

async function syncOne(
  tool: BuiltTool,
  prior: VapiToolRef | undefined,
): Promise<VapiToolRef> {
  let response: VapiToolResponse;
  if (prior) {
    try {
      response = await updateTool(prior.id, tool.payload);
    } catch (err) {
      // If the tool was deleted out-of-band on Vapi (or the id got stale),
      // fall back to a fresh create so the integration self-heals.
      if (err instanceof Error && /404|not.?found/i.test(err.message)) {
        response = await createTool(tool.payload);
      } else {
        throw err;
      }
    }
  } else {
    response = await createTool(tool.payload);
  }

  return {
    kind: tool.kind,
    id: response.id,
    functionName: tool.functionName,
    lastSyncedAt: new Date().toISOString(),
  };
}

/**
 * DELETE /api/integrations/notion/[id]/sync-tools
 *
 * Body: `{ vapiTools: VapiToolRef[] }`. Removes all listed Vapi tools.
 * 404 / missing-on-server errors are swallowed because the goal is to converge
 * the workspace to a state where Scale Labs no longer owns those tools.
 */
export async function DELETE(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      vapiTools?: { id: string }[];
    };
    const refs = body.vapiTools ?? [];
    const errors: { id: string; error: string }[] = [];

    for (const ref of refs) {
      try {
        await deleteTool(ref.id);
      } catch (err) {
        if (err instanceof Error && /404|not.?found/i.test(err.message)) {
          continue;
        }
        errors.push({
          id: ref.id,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({ ok: errors.length === 0, errors });
  } catch (err) {
    const { status, body } = toVapiRouteError(err);
    return NextResponse.json(body, { status });
  }
}
