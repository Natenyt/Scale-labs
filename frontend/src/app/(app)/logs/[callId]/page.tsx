"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeftIcon, SearchIcon } from "lucide-react";
import { useCompleteNavigationWhenReady } from "@/components/navigation/navigation-pending";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QueryErrorCard } from "@/components/query/query-error-card";
import { hasBackendApi } from "@/lib/api/env";
import { useCallLogQuery } from "@/lib/query/use-call-log-query";
import { cn } from "@/lib/utils";

function formatStarted(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function formatLogTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return String(iso);
  }
}

function levelVariant(level: string): "default" | "secondary" | "destructive" | "outline" {
  if (level === "error") return "destructive";
  if (level === "warn" || level === "warning") return "outline";
  return "secondary";
}

export default function CallLogDetailPage() {
  const params = useParams<{ callId: string }>();
  const callId = decodeURIComponent(params.callId ?? "");

  if (!callId) {
    return (
      <div className="border-destructive/40 bg-destructive/5 text-destructive rounded-lg border px-4 py-3 text-sm">
        Missing call ID.
      </div>
    );
  }

  return <CallLogDetailBody callId={callId} />;
}

function CallLogDetailBody({ callId }: { callId: string }) {
  const { data: detail, isPending, isLoading, error } = useCallLogQuery(callId);
  const [logQuery, setLogQuery] = React.useState("");

  const filteredLogs = React.useMemo(() => {
    if (!detail) return [];
    const q = logQuery.trim().toLowerCase();
    if (!q) return detail.logs;
    return detail.logs.filter(
      (l) =>
        l.message.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q),
    );
  }, [detail, logQuery]);

  const pageReady = !hasBackendApi() || Boolean(detail) || Boolean(error);
  useCompleteNavigationWhenReady(pageReady);

  if (!hasBackendApi()) {
    return <QueryErrorCard message="API is not configured." />;
  }

  if (!pageReady && (isPending || isLoading)) {
    return null;
  }

  if (error || !detail) {
    return (
      <div className="grid gap-4 pt-2">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href="/logs">
            <ArrowLeftIcon className="size-4" />
            Back to logs
          </Link>
        </Button>
        <QueryErrorCard
          message={
            error instanceof Error ? error.message : "Call not found"
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 pt-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2">
          <Button asChild variant="ghost" size="sm" className="w-fit -ml-2">
            <Link href="/logs">
              <ArrowLeftIcon className="size-4" />
              Back to logs
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {detail.resourceName}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {formatStarted(detail.startedAt)} · {detail.type} ·{" "}
              {detail.endedReason}
            </p>
          </div>
        </div>
        <div className="text-right text-sm">
          <p className="font-medium tabular-nums">{detail.costDetail.totalLabel}</p>
          <p className="text-muted-foreground">{detail.costDetail.durationLabel}</p>
        </div>
      </div>

      {detail.recordingUrl ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm">Recording</CardTitle>
          </CardHeader>
          <CardContent>
            <audio controls className="w-full" src={detail.recordingUrl}>
              Your browser does not support audio playback.
            </audio>
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="transcripts" className="gap-4">
        <TabsList variant="line">
          <TabsTrigger value="transcripts">Transcripts</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="cost">Call cost</TabsTrigger>
        </TabsList>

        <TabsContent value="transcripts">
          <Card size="sm" className="min-h-[320px]">
            <CardContent className="pt-4">
              {detail.transcript.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center text-sm">
                  No transcript for this call.
                </p>
              ) : (
                <ScrollArea className="h-[min(480px,60vh)] pr-3">
                  <div className="grid gap-3">
                    {detail.transcript.map((line, i) => (
                      <div
                        key={`${line.role}-${i}`}
                        className={cn(
                          "max-w-[85%] rounded-lg border px-3 py-2 text-sm",
                          line.role === "user"
                            ? "border-amber-500/30 bg-amber-950/40 ml-auto"
                            : "border-border/60 bg-muted/30",
                        )}
                      >
                        <p
                          className={cn(
                            "mb-1 text-[10px] font-medium uppercase tracking-wider",
                            line.role === "user"
                              ? "text-amber-200/80"
                              : "text-emerald-200/80",
                          )}
                        >
                          {line.role === "user" ? "User" : "Assistant"}
                        </p>
                        <p className="leading-relaxed">{line.text}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card size="sm">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm">Session logs</CardTitle>
              <div className="relative w-full max-w-xs">
                <SearchIcon className="text-muted-foreground absolute top-2.5 left-2.5 size-3.5" />
                <Input
                  placeholder="Search logs…"
                  value={logQuery}
                  onChange={(e) => setLogQuery(e.target.value)}
                  className="h-8 pl-8 text-xs"
                />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {filteredLogs.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center text-sm">
                  {detail.logs.length === 0
                    ? "No session logs for this call."
                    : "No logs match your search."}
                </p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Time</TableHead>
                        <TableHead className="w-[72px]">Level</TableHead>
                        <TableHead className="w-[100px]">Category</TableHead>
                        <TableHead>Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((entry, i) => (
                        <TableRow key={`${entry.time}-${i}`}>
                          <TableCell className="text-muted-foreground font-mono text-[11px]">
                            {formatLogTime(entry.time)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={levelVariant(entry.level)}
                              className="text-[10px] capitalize"
                            >
                              {entry.level}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{entry.category}</TableCell>
                          <TableCell className="text-xs">{entry.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cost">
          <div className="grid gap-4 md:grid-cols-3">
            <Card size="sm">
              <CardHeader>
                <CardTitle className="text-muted-foreground text-xs font-normal">
                  Total cost
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">
                  {detail.costDetail.totalLabel}
                </p>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardTitle className="text-muted-foreground text-xs font-normal">
                  Duration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {detail.costDetail.durationLabel}
                </p>
              </CardContent>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardTitle className="text-muted-foreground text-xs font-normal">
                  Line items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {detail.costDetail.items.length}
                </p>
              </CardContent>
            </Card>
          </div>
          <Card size="sm" className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm">Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {detail.costDetail.items.length === 0 ? (
                <p className="text-muted-foreground text-sm">No cost breakdown available.</p>
              ) : (
                detail.costDetail.items.map((item) => (
                  <div key={item.label} className="grid gap-1.5">
                    <div className="flex justify-between text-xs">
                      <span>{item.label}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {item.amountLabel} ({item.percent}%)
                      </span>
                    </div>
                    <Progress value={item.percent} className="h-2" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
