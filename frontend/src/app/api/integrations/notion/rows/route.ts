import { NextResponse } from "next/server";

import {
  getNotionClient,
  normalizeNotionType,
  toRouteError,
} from "@/lib/notion/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/integrations/notion/rows
 *
 * Body: { dataSourceId: string, properties: Record<string, unknown>,
 *         schemaHints?: Record<string, string> }
 *
 * `properties` is in our normalized shape (raw values keyed by sanitized keys
 * or display names). The route maps the values onto Notion's property shape
 * using `schemaHints` (optional map of property-name -> Notion type) so a
 * caller without the full schema can still hand-shape a payload.
 *
 * This route is used by workflow nodes and tests today; the standalone agent
 * does NOT call it directly (CRM write moves to workflow path).
 */
export async function POST(req: Request) {
  try {
    const notion = getNotionClient(req);
    const json = (await req.json()) as {
      dataSourceId?: string;
      properties?: Record<string, unknown>;
      schemaHints?: Record<string, string>;
    };

    if (!json.dataSourceId) {
      return NextResponse.json(
        { error: "dataSourceId is required" },
        { status: 400 },
      );
    }

    const hints = json.schemaHints ?? {};
    const notionProperties: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(json.properties ?? {})) {
      if (value == null || value === "") continue;
      const type = normalizeNotionType(hints[key] ?? "rich_text");
      notionProperties[key] = shapeProperty(type, value);
    }

    const created = await notion.pages.create({
      parent: { type: "data_source_id", data_source_id: json.dataSourceId },
      properties: notionProperties as Parameters<
        typeof notion.pages.create
      >[0]["properties"],
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (err) {
    const { status, body } = toRouteError(err);
    return NextResponse.json(body, { status });
  }
}

function shapeProperty(type: string, value: unknown): unknown {
  switch (type) {
    case "title":
      return { title: [{ text: { content: String(value) } }] };
    case "rich_text":
      return { rich_text: [{ text: { content: String(value) } }] };
    case "number":
      return { number: typeof value === "number" ? value : Number(value) };
    case "select":
      return { select: { name: String(value) } };
    case "status":
      return { status: { name: String(value) } };
    case "multi_select":
      return {
        multi_select: (Array.isArray(value) ? value : [value]).map((v) => ({
          name: String(v),
        })),
      };
    case "date":
      return { date: { start: String(value) } };
    case "checkbox":
      return { checkbox: Boolean(value) };
    case "url":
      return { url: String(value) };
    case "email":
      return { email: String(value) };
    case "phone_number":
      return { phone_number: String(value) };
    default:
      return { rich_text: [{ text: { content: String(value) } }] };
  }
}
