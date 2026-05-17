"use client";

import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
        <p className="text-muted-foreground/80 text-[11px] font-medium uppercase tracking-[0.12em]">
          Needs attention
        </p>
        <p className="text-muted-foreground text-xs">
          Unsuccessful calls · last 30 days
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2 pb-4">
        {top.length === 0 ? (
          <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-1 py-4 text-center">
            <p className="text-sm">All clear</p>
            <p className="text-[11px]">No failed or dropped calls.</p>
          </div>
        ) : (
          <ul className="divide-border/40 flex flex-col divide-y">
            {top.map((call) => (
              <li key={call.id} className="flex items-start justify-between gap-3 py-2.5">
                <div className="min-w-0 grid gap-0.5">
                  <p className="truncate text-sm font-medium">{call.resourceName}</p>
                  <p className="text-muted-foreground text-[11px]">
                    {formatCallTime(call.startedAt)}
                  </p>
                </div>
                <span className="bg-destructive/10 text-destructive shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                  {call.statusLabel}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Button
          asChild
          variant="link"
          size="sm"
          className="text-muted-foreground hover:text-foreground mt-auto h-auto justify-start px-0 text-xs"
        >
          <Link href="/logs">
            Review in logs
            <ArrowRightIcon className="size-3" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
