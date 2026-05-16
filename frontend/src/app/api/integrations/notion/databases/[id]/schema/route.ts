import { NextResponse } from "next/server";

import { sanitizeKey } from "@/lib/integrations/sanitize";
import type { FieldMapping, NotionFieldType } from "@/lib/integrations/types";
import {
  getNotionClient,
  normalizeNotionType,
  plainTextFromTitle,
  toRouteError,
} from "@/lib/notion/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string }> };

/**
 * GET /api/integrations/notion/databases/[id]/schema
 *
 * `id` is a Notion **data source id**. Returns a normalized schema we can use
 * to drive the column-mapping UI and (later) generate Vapi function-tool
 * JSON schemas.
 */
export async function GET(req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const notion = getNotionClient(req);

    // The SDK return type is a union that includes a "partial" variant
    // missing `parent` / `properties` / `title`. The retrieve endpoint always
    // returns the full object at runtime, so we narrow through a structural cast.
    const dataSource = (await notion.dataSources.retrieve({
      data_source_id: id,
    })) as {
      id: string;
      parent?: { type: string; database_id?: string };
      properties?: Record<string, unknown>;
      title?: { plain_text?: string }[];
    };

    const parent = dataSource.parent;
    const databaseId =
      parent && parent.type === "database_id" && parent.database_id
        ? parent.database_id
        : null;

    const properties = dataSource.properties ?? {};

    const fieldMap: FieldMapping[] = Object.entries(properties).map(
      ([name, raw]) => {
        const prop = raw as {
          id?: string;
          type: string;
          select?: { options?: { id: string; name: string; color?: string }[] };
          multi_select?: { options?: { id: string; name: string; color?: string }[] };
          status?: { options?: { id: string; name: string; color?: string }[] };
        };
        const notionType: NotionFieldType = normalizeNotionType(prop.type);
        const options =
          prop[notionType as "select" | "multi_select" | "status"]?.options;
        return {
          notionPropertyId: prop.id ?? name,
          notionPropertyName: name,
          notionType,
          key: sanitizeKey(name),
          description: "",
          options: options
            ? options.map((o) => ({ id: o.id, name: o.name, color: o.color }))
            : undefined,
          loadIntoContext: notionType === "title" || isLikelyKey(name),
        };
      },
    );

    return NextResponse.json({
      ok: true,
      dataSourceId: dataSource.id,
      databaseId,
      title: plainTextFromTitle(dataSource.title),
      properties: fieldMap,
    });
  } catch (err) {
    const { status, body } = toRouteError(err);
    return NextResponse.json(body, { status });
  }
}

/**
 * Best-effort guess: a Notion property is a likely lookup key if its name
 * matches common identity columns. The user can toggle this in the UI either way.
 */
function isLikelyKey(name: string): boolean {
  const lc = name.toLowerCase();
  return (
    lc.includes("phone") ||
    lc.includes("email") ||
    lc.includes("name") ||
    lc === "id" ||
    lc.endsWith(" id")
  );
}
