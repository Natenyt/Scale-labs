/**
 * /api/workflows/[id]/sync-vapi
 *
 * Mirrors the Notion tools sync route: client ships the full `Workflow`
 * record, server compiles to Vapi's REST shape and POST/PATCHes against
 * https://api.vapi.ai/workflow.
 *
 * Trust model in MVP: client is the source of truth (workflows live in
 * localStorage until Day 9). Server never trusts the `vapiWorkflowId`
 * sent in the body for *authorization* — it only uses it to decide
 * create-vs-update.
 */

import { NextResponse } from "next/server";

import {
  createWorkflow as createVapiWorkflow,
  deleteWorkflow as deleteVapiWorkflow,
  type VapiWorkflowPayload,
  toVapiRouteError,
  updateWorkflow as updateVapiWorkflow,
} from "@/lib/vapi/server";
import { compileToVapiPayload } from "@/lib/workflows/vapi-compile";
import type { Workflow } from "@/lib/workflows/types";

type SyncRequestBody = Workflow & { vapiPayload?: VapiWorkflowPayload };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const body = (await req.json()) as SyncRequestBody;
    const workflow = body;

    if (!workflow || workflow.id !== id) {
      return NextResponse.json(
        { error: "Body workflow.id must match the route id" },
        { status: 400 },
      );
    }

    let vapiPayload: VapiWorkflowPayload;
    if (body.vapiPayload) {
      vapiPayload = body.vapiPayload;
    } else {
      const compile = compileToVapiPayload(workflow);
      if (!compile.ok) {
        return NextResponse.json(
          {
            error: "Workflow has validation errors",
            code: "workflow_invalid",
            detail: compile.errors,
          },
          { status: 400 },
        );
      }
      vapiPayload = compile.payload;
    }

    const lastSyncedAt = new Date().toISOString();

    if (workflow.vapiWorkflowId) {
      try {
        const response = await updateVapiWorkflow(
          workflow.vapiWorkflowId,
          vapiPayload,
        );
        return NextResponse.json({
          ok: true,
          vapiWorkflowId: response.id,
          lastSyncedAt,
        });
      } catch (err) {
        // Self-heal: if Vapi forgot about this workflow, fall back to create.
        if (err instanceof Error && /404|not.?found/i.test(err.message)) {
          const response = await createVapiWorkflow(vapiPayload);
          return NextResponse.json({
            ok: true,
            vapiWorkflowId: response.id,
            lastSyncedAt,
            recreated: true,
          });
        }
        throw err;
      }
    }

    const response = await createVapiWorkflow(vapiPayload);
    return NextResponse.json({
      ok: true,
      vapiWorkflowId: response.id,
      lastSyncedAt,
    });
  } catch (err) {
    const { status, body } = toVapiRouteError(err);
    return NextResponse.json(body, { status });
  }
}

/**
 * DELETE /api/workflows/[id]/sync-vapi
 *
 * Body: `{ vapiWorkflowId?: string }`. We only call Vapi if we have an id —
 * otherwise there is nothing to remove. 404 from Vapi is treated as success.
 */
export async function DELETE(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      vapiWorkflowId?: string;
    };
    if (!body.vapiWorkflowId) {
      return NextResponse.json({ ok: true });
    }
    try {
      await deleteVapiWorkflow(body.vapiWorkflowId);
    } catch (err) {
      if (err instanceof Error && /404|not.?found/i.test(err.message)) {
        return NextResponse.json({ ok: true });
      }
      throw err;
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { status, body } = toVapiRouteError(err);
    return NextResponse.json(body, { status });
  }
}
