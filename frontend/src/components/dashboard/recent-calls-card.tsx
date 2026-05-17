"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { CallLogSummary } from "@/lib/calls/call-logs-api";

function formatStarted(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function typeClass(type: string): string {
  if (type === "Web") return "text-muted-foreground";
  if (type === "Inbound") return "text-emerald-300";
  if (type === "Outbound") return "text-sky-300";
  return "text-muted-foreground";
}

export function RecentCallsCard({ calls }: { calls: CallLogSummary[] }) {
  const router = useRouter();

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <div className="grid gap-0.5">
          <p className="text-muted-foreground/80 text-[11px] font-medium uppercase tracking-[0.12em]">
            Recent calls
          </p>
          <p className="text-foreground text-sm font-medium">Last 14 days</p>
        </div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground -mr-1"
        >
          <Link href="/logs">
            View all
            <ArrowRightIcon className="size-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        {calls.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            No calls yet. Open an agent and use{" "}
            <Link href="/agents" className="text-foreground font-medium underline underline-offset-2">
              Test
            </Link>{" "}
            to place your first call.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/40 hover:bg-transparent">
                <TableHead className="text-muted-foreground/80 px-4 text-[10px] font-medium uppercase tracking-[0.1em]">
                  When
                </TableHead>
                <TableHead className="text-muted-foreground/80 text-[10px] font-medium uppercase tracking-[0.1em]">
                  Agent
                </TableHead>
                <TableHead className="text-muted-foreground/80 text-[10px] font-medium uppercase tracking-[0.1em]">
                  Type
                </TableHead>
                <TableHead className="text-muted-foreground/80 text-right text-[10px] font-medium uppercase tracking-[0.1em]">
                  Duration
                </TableHead>
                <TableHead className="text-muted-foreground/80 text-right text-[10px] font-medium uppercase tracking-[0.1em] pr-4">
                  Cost
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-border/40 hover:bg-muted/30 cursor-pointer"
                  onClick={() => router.push(`/logs/${row.id}`)}
                >
                  <TableCell className="text-muted-foreground px-4 text-xs whitespace-nowrap">
                    {formatStarted(row.startedAt)}
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate text-sm font-medium">
                    {row.resourceName}
                  </TableCell>
                  <TableCell>
                    <span className={cn("text-[11px] font-medium uppercase tracking-wide", typeClass(row.type))}>
                      {row.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    {row.durationLabel}
                  </TableCell>
                  <TableCell className="pr-4 text-right text-xs tabular-nums">
                    {row.costLabel}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
