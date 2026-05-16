import { NextResponse } from "next/server";

import {
  getNotionClient,
  plainTextFromTitle,
  toRouteError,
} from "@/lib/notion/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/integrations/notion/databases?query=...
 *
 * Lists Notion **data sources** (the 2025+ replacement for raw databases) that
 * the connected integration has access to. We return both `database_id` and
 * `data_source_id` so the integrations store can persist the full pair.
 */
export async function GET(req: Request) {
  try {
    const notion = getNotionClient(req);
    const url = new URL(req.url);
    const query = url.searchParams.get("query") ?? "";

    const response = await notion.search({
      query,
      filter: { property: "object", value: "data_source" },
      page_size: 50,
      sort: { direction: "descending", timestamp: "last_edited_time" },
    });

    // The SDK union includes a "partial" variant that omits some fields, but
    // search results carry them at runtime. Narrow via a structural type.
    type DataSourceHit = {
      object: "data_source";
      id: string;
      parent?: { type: string; database_id?: string };
      title?: { plain_text?: string }[];
      url?: string;
      last_edited_time?: string;
    };

    const items = (response.results as DataSourceHit[])
      .filter((r) => r.object === "data_source")
      .map((ds) => {
        const parent = ds.parent;
        const databaseId =
          parent && parent.type === "database_id" && parent.database_id
            ? parent.database_id
            : null;
        return {
          dataSourceId: ds.id,
          databaseId,
          title: plainTextFromTitle(ds.title) || "Untitled",
          url: ds.url ?? null,
          lastEditedTime: ds.last_edited_time ?? null,
        };
      })
      .filter(
        (d): d is typeof d & { databaseId: string } => d.databaseId != null,
      );

    return NextResponse.json({
      ok: true,
      items,
      hasMore: response.has_more,
      nextCursor: response.next_cursor,
    });
  } catch (err) {
    const { status, body } = toRouteError(err);
    return NextResponse.json(body, { status });
  }
}
