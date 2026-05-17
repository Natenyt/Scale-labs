"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CopyIcon, MoreHorizontalIcon } from "lucide-react";
import { toast } from "sonner";

import { QueryErrorCard } from "@/components/query/query-error-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { hasBackendApi } from "@/lib/api/env";
import { useCallLogsQuery } from "@/lib/query/use-call-logs-query";
import { cn } from "@/lib/utils";

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

export function LogsCallTable({
  days,
  agentId,
  onReadyChange,
}: {
  days: string;
  agentId: string;
  onReadyChange?: (ready: boolean) => void;
}) {
  const router = useRouter();
  const daysNum = Number(days);
  const { data: rows = [], isPending, isLoading, isFetching, error } =
    useCallLogsQuery({
      days: daysNum,
      agentId: agentId || undefined,
    });

  const ready = !hasBackendApi() || Boolean(error) || (!isPending && !isLoading);

  React.useLayoutEffect(() => {
    onReadyChange?.(ready);
  }, [ready, onReadyChange]);

  if (!hasBackendApi()) {
    return <QueryErrorCard message="API is not configured." />;
  }

  if (!ready && (isPending || isLoading)) {
    return null;
  }

  if (error) {
    return (
      <QueryErrorCard
        message={error instanceof Error ? error.message : "Could not load logs"}
      />
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-muted-foreground grid gap-2 px-6 py-16 text-center text-sm">
        <p>No calls in this period.</p>
        <p className="text-xs">
          Open an agent and use{" "}
          <Link href="/agents" className="text-foreground underline">
            Test
          </Link>
          , then refresh.
        </p>
      </div>
    );
  }

  return (
    <Table className={cn(isFetching && "opacity-80 transition-opacity")}>
      <TableHeader>
        <TableRow>
          <TableHead>Started</TableHead>
          <TableHead>Assistant</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Ended</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead className="text-right">Cost</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={row.id}
            className="cursor-pointer"
            onClick={() => router.push(`/logs/${encodeURIComponent(row.id)}`)}
          >
            <TableCell className="whitespace-nowrap text-xs">
              {formatStarted(row.startedAt)}
            </TableCell>
            <TableCell className="max-w-[180px] truncate text-xs font-medium">
              {row.resourceName}
            </TableCell>
            <TableCell>
              <Badge variant={typeBadgeVariant(row.type)} className="text-[10px]">
                {row.type}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground max-w-[140px] truncate text-xs">
              {row.endedReason}
            </TableCell>
            <TableCell className="text-xs">{row.durationLabel}</TableCell>
            <TableCell className="text-right text-xs tabular-nums">
              {row.costLabel}
            </TableCell>
            <TableCell onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="size-8 px-0">
                    <MoreHorizontalIcon className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      void navigator.clipboard.writeText(row.id);
                      toast.success("Call ID copied");
                    }}
                  >
                    <CopyIcon className="size-3.5" />
                    Copy call ID
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/logs/${row.id}`}>View call details</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
