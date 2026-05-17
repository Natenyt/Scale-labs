"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

function typeBadgeVariant(type: string): "default" | "secondary" | "outline" {
  if (type === "Web") return "secondary";
  if (type === "Inbound") return "outline";
  return "default";
}

export function RecentCallsCard({ calls }: { calls: CallLogSummary[] }) {
  const router = useRouter();

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <div>
          <CardTitle className="text-sm font-medium">Recent calls</CardTitle>
          <p className="text-muted-foreground text-xs">Last 14 days</p>
        </div>
        <Button asChild variant="link" size="sm" className="h-auto px-0 text-xs">
          <Link href="/logs">View all</Link>
        </Button>
      </CardHeader>
      <CardContent className="pb-4">
        {calls.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            No calls yet. Open an agent and use{" "}
            <Link href="/agents" className="text-foreground font-medium underline">
              Test
            </Link>{" "}
            to place your first call.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">When</TableHead>
                <TableHead className="text-xs">Agent</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-right text-xs">Duration</TableHead>
                <TableHead className="text-right text-xs">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/logs/${row.id}`)}
                >
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                    {formatStarted(row.startedAt)}
                  </TableCell>
                  <TableCell className="max-w-[140px] truncate text-sm font-medium">
                    {row.resourceName}
                  </TableCell>
                  <TableCell>
                    <Badge variant={typeBadgeVariant(row.type)} className="text-[10px]">
                      {row.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    {row.durationLabel}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
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
