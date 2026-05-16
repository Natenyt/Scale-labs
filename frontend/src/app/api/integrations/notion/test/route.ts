import { NextResponse } from "next/server";

import {
  getNotionClient,
  toRouteError,
  plainTextFromTitle,
} from "@/lib/notion/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/integrations/notion/test
 *
 * Token smoke-test. Returns the bot user + workspace info so the UI can confirm
 * "Connected as <workspace>" before moving on to picking a database.
 */
export async function GET(req: Request) {
  try {
    const notion = getNotionClient(req);
    const me = await notion.users.me({});

    const isBot = me.type === "bot";
    const botInfo = isBot ? me.bot : null;

    return NextResponse.json({
      ok: true,
      user: {
        id: me.id,
        name: me.name ?? null,
        avatar_url: me.avatar_url ?? null,
        type: me.type,
      },
      workspace: botInfo
        ? {
            name: botInfo.workspace_name ?? null,
            ownerType: botInfo.owner?.type ?? null,
          }
        : null,
      noteOnTokenScope: isBot
        ? null
        : "This token belongs to a real user, not a Notion integration. Use an internal integration token instead.",
      _meta: { previewTitle: plainTextFromTitle(undefined) },
    });
  } catch (err) {
    const { status, body } = toRouteError(err);
    return NextResponse.json(body, { status });
  }
}
