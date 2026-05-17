"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UnsuccessfulCall } from "@/lib/metrics/metrics-api";

function formatCallTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function NeedsAttentionCard({
  calls,
}: {
  calls: UnsuccessfulCall[];
}) {
  const top = calls.slice(0, 4);

  return (
    <Card size="sm" className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Needs attention</CardTitle>
        <p className="text-muted-foreground text-xs">
          Unsuccessful calls in the last 30 days
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2 pb-4">
        {top.length === 0 ? (
          <p className="text-muted-foreground flex flex-1 items-center justify-center py-6 text-center text-sm">
            All clear — no failed or dropped calls in this period.
          </p>
        ) : (
          <ul className="divide-border/60 flex flex-col divide-y">
            {top.map((call) => (
              <li key={call.id} className="flex items-start justify-between gap-2 py-2.5">
                <div className="min-w-0 grid gap-0.5">
                  <p className="truncate text-sm font-medium">{call.resourceName}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatCallTime(call.startedAt)}
                  </p>
                </div>
                <Badge variant="destructive" className="shrink-0 text-[10px]">
                  {call.statusLabel}
                </Badge>
              </li>
            ))}
          </ul>
        )}
        <Button asChild variant="link" size="sm" className="mt-auto h-auto px-0">
          <Link href="/logs">Review in logs</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
