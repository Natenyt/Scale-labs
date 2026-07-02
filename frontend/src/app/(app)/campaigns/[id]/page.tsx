"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  Loader2Icon,
  MegaphoneIcon,
  SquareIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  deleteCampaign,
  fetchCampaignLive,
  stopCampaign,
} from "@/lib/campaigns/campaigns-api";
import { CAMPAIGN_TERMINAL, type CampaignLive } from "@/lib/campaigns/types";
import {
  useCampaignQuery,
  useInvalidateCampaigns,
} from "@/lib/query/use-campaigns-query";
import { cn } from "@/lib/utils";

const COUNTER_LABELS: [keyof CampaignLive["counters"], string][] = [
  ["scheduled", "Scheduled"],
  ["queued", "Queued"],
  ["inProgress", "In progress"],
  ["voicemail", "Voicemail"],
  ["ended", "Ended"],
];

function LiveStatus({ id, initialStatus }: { id: string; initialStatus: string }) {
  const [live, setLive] = React.useState<CampaignLive | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    async function tick() {
      try {
        const res = await fetchCampaignLive(id);
        if (!active) return;
        setLive(res);
        setError(null);
        if (CAMPAIGN_TERMINAL.has(res.status)) return; // stop polling
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Could not load status.");
      }
      timer = setTimeout(tick, 5000);
    }
    void tick();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [id]);

  const status = live?.status ?? initialStatus;
  const counters = live?.counters ?? {};

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-2 text-sm">
        <span
          className={cn(
            "size-2 rounded-full",
            status === "in-progress"
              ? "animate-pulse bg-emerald-400"
              : status === "scheduled"
                ? "bg-amber-400"
                : "bg-muted-foreground/50",
          )}
        />
        <span className="font-medium capitalize">{status.replace("-", " ")}</span>
        {!live && !error ? (
          <span className="text-muted-foreground text-xs">loading…</span>
        ) : null}
        {error ? <span className="text-destructive text-xs">{error}</span> : null}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {COUNTER_LABELS.map(([key, label]) => (
          <div
            key={key}
            className="border-border/60 bg-background/40 rounded-lg border p-3 text-center"
          >
            <div className="text-lg font-semibold tabular-nums">
              {counters[key] ?? "—"}
            </div>
            <div className="text-muted-foreground mt-0.5 text-[11px]">{label}</div>
          </div>
        ))}
      </div>
      <p className="text-muted-foreground text-xs">
        Live counters from Vapi. Per-call logs aren&apos;t filterable by campaign
        in the Vapi API yet.
      </p>
    </div>
  );
}

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: campaign, isLoading, isError } = useCampaignQuery(params.id);
  const { invalidateAll, invalidateDetail } = useInvalidateCampaigns();
  const [stopping, setStopping] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  if (isLoading) {
    return (
      <div className="text-muted-foreground grid place-items-center py-24 text-sm">
        <Loader2Icon className="size-4 animate-spin" />
      </div>
    );
  }
  if (isError || !campaign) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-xl">
          <MegaphoneIcon className="size-5" />
        </div>
        <h2 className="text-base font-medium">Campaign not found</h2>
        <Button asChild variant="outline">
          <Link href="/campaigns">
            <ArrowLeftIcon className="size-4" /> Back to campaigns
          </Link>
        </Button>
      </div>
    );
  }

  const terminal = CAMPAIGN_TERMINAL.has(campaign.status);
  const campaignId = campaign.id;
  const campaignName = campaign.name;

  async function onStop() {
    if (!window.confirm("Stop this campaign? Scheduled calls are cancelled.")) return;
    setStopping(true);
    try {
      await stopCampaign(campaignId);
      toast.success("Campaign stopped");
      void invalidateAll();
      void invalidateDetail(campaignId);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not stop campaign.");
    } finally {
      setStopping(false);
    }
  }

  async function onDelete() {
    if (!window.confirm(`Delete “${campaignName}”? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteCampaign(campaignId);
      toast.success("Campaign deleted");
      void invalidateAll();
      router.replace("/campaigns");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete campaign.");
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <div className="grid gap-3">
        <Link
          href="/campaigns"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition"
        >
          <ArrowLeftIcon className="size-4" /> Campaigns
        </Link>
        <PageHeader
          eyebrow="Build"
          title={campaign.name}
          description={`${campaign.target_kind} · ${campaign.recipient_count} recipients`}
          actions={
            <>
              {!terminal ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onStop}
                  disabled={stopping}
                  className="gap-1.5"
                >
                  {stopping ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <SquareIcon className="size-4" />
                  )}
                  Stop
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                disabled={deleting}
                className="text-destructive hover:text-destructive gap-1.5"
              >
                {deleting ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <Trash2Icon className="size-4" />
                )}
                Delete
              </Button>
            </>
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <LiveStatus id={campaign.id} initialStatus={campaign.status} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <Field label="Answered by" value={`${campaign.target_kind}`} capitalize />
          <Field label="Recipients" value={String(campaign.recipient_count)} />
          <Field
            label="Schedule"
            value={
              campaign.schedule_earliest_at
                ? new Date(campaign.schedule_earliest_at).toLocaleString()
                : "Immediate"
            }
          />
          <Field label="Vapi campaign" value={campaign.vapi_campaign_id || "—"} mono />
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  capitalize,
}: {
  label: string;
  value: string;
  mono?: boolean;
  capitalize?: boolean;
}) {
  return (
    <div className="grid gap-1">
      <div className="text-muted-foreground/80 text-[10px] font-medium uppercase tracking-wider">
        {label}
      </div>
      <div
        className={cn(
          mono && "font-mono text-xs",
          capitalize && "capitalize",
        )}
      >
        {value}
      </div>
    </div>
  );
}
