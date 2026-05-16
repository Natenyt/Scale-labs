import { NextResponse } from "next/server";

import { getNotionClient, toRouteError } from "@/lib/notion/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/integrations/notion/rows/query
 *
 * Body: { dataSourceId: string, filter?: object, sorts?: object[], pageSize?: number }
 *
 * Thin pass-through to `dataSources.query`. Workflows and the pre-call context
 * loader will use this to fetch rows by phone number / email / any property.
 */
export async function POST(req: Request) {
  try {
    const notion = getNotionClient(req);
    const json = (await req.json()) as {
      dataSourceId?: string;
      filter?: Record<string, unknown>;
      sorts?: { property: string; direction: "ascending" | "descending" }[];
      pageSize?: number;
      startCursor?: string;
    };

    if (!json.dataSourceId) {
      return NextResponse.json(
        { error: "dataSourceId is required" },
        { status: 400 },
      );
    }

    const response = await notion.dataSources.query({
      data_source_id: json.dataSourceId,
      filter: json.filter as Parameters<
        typeof notion.dataSources.query
      >[0]["filter"],
      sorts: json.sorts,
      page_size: json.pageSize ?? 25,
      start_cursor: json.startCursor,
    });

    return NextResponse.json({
      ok: true,
      results: response.results,
      hasMore: response.has_more,
      nextCursor: response.next_cursor,
    });
  } catch (err) {
    const { status, body } = toRouteError(err);
    return NextResponse.json(body, { status });
  }
}
