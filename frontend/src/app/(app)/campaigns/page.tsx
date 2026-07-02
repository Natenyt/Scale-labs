"use client";

import Link from "next/link";
import { Loader2Icon, MegaphoneIcon, PlusIcon } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCampaignsQuery } from "@/lib/query/use-campaigns-query";
import { CAMPAIGN_TERMINAL } from "@/lib/campaigns/types";

function fmtDate(ts: string): string {
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return ts;
  }
}

function statusVariant(status: string): "secondary" | "outline" | "destructive" {
  if (status === "in-progress") return "secondary";
  if (CAMPAIGN_TERMINAL.has(status)) return "outline";
  return "outline";
}

export default function CampaignsPage() {
  const { data: campaigns, isLoading, isError, error } = useCampaignsQuery();

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Build"
        title="Campaigns"
        description="Outbound batch calls — dial a list of recipients with one of your agents or squads."
        actions={
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/campaigns/new">
              <PlusIcon className="size-4" />
              New campaign
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <div className="text-muted-foreground grid place-items-center py-24 text-sm">
          <Loader2Icon className="size-4 animate-spin" />
        </div>
      ) : isError ? (
        <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm">
          {error instanceof Error ? error.message : "Could not load campaigns."}
        </div>
      ) : !campaigns || campaigns.length === 0 ? (
        <div className="border-border/60 flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-20 text-center">
          <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-xl">
            <MegaphoneIcon className="size-5" />
          </div>
          <div className="grid gap-1">
            <h2 className="text-base font-medium">No campaigns yet</h2>
            <p className="text-muted-foreground mx-auto max-w-sm text-sm">
              Create a campaign to call a list of recipients from a Twilio number
              with one of your agents or squads.
            </p>
          </div>
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/campaigns/new">
              <PlusIcon className="size-4" />
              New campaign
            </Link>
          </Button>
        </div>
      ) : (
        <div className="border-border/60 overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Answered by</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c) => (
                <TableRow key={c.id} className="hover:bg-accent/30">
                  <TableCell>
                    <Link
                      href={`/campaigns/${c.id}`}
                      className="hover:text-foreground font-medium transition"
                    >
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground capitalize">
                    {c.target_kind}
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {c.recipient_count}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(c.status)} className="capitalize">
                      {c.status.replace("-", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {fmtDate(c.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
