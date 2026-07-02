"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  Loader2Icon,
  SendIcon,
  UploadIcon,
} from "lucide-react";
import { toast } from "sonner";

import { useAgents } from "@/components/agents/agents-store";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { hasBackendApi } from "@/lib/api/env";
import { createCampaign } from "@/lib/campaigns/campaigns-api";
import {
  parseCustomers,
  parseCustomersCsv,
  type CampaignCustomer,
} from "@/lib/campaigns/types";
import { useInvalidateCampaigns } from "@/lib/query/use-campaigns-query";
import { usePhoneNumbersQuery } from "@/lib/query/use-phone-numbers-query";
import { useSquadsQuery } from "@/lib/query/use-squads-query";

type TargetKind = "agent" | "squad";

export default function NewCampaignPage() {
  const router = useRouter();
  const { agents } = useAgents();
  const { data: squads = [] } = useSquadsQuery();
  const { data: phoneNumbers = [] } = usePhoneNumbersQuery();
  const { invalidateAll } = useInvalidateCampaigns();
  const fileRef = React.useRef<HTMLInputElement>(null);

  // Only Twilio numbers can run outbound campaigns.
  const twilioNumbers = React.useMemo(
    () => phoneNumbers.filter((p) => p.provider === "twilio"),
    [phoneNumbers],
  );
  const eligibleAgents = React.useMemo(
    () => agents.filter((a) => Boolean(a.vapiAssistantId)),
    [agents],
  );
  const eligibleSquads = React.useMemo(
    () => squads.filter((s) => Boolean(s.vapi_squad_id)),
    [squads],
  );

  const [name, setName] = React.useState("");
  const [phoneId, setPhoneId] = React.useState("");
  const [targetKind, setTargetKind] = React.useState<TargetKind>("agent");
  const [targetId, setTargetId] = React.useState("");
  const [paste, setPaste] = React.useState("");
  const [csv, setCsv] = React.useState<{
    customers: CampaignCustomer[];
    invalid: number;
    name: string;
  } | null>(null);
  const [schedule, setSchedule] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const targetOptions = targetKind === "agent" ? eligibleAgents : eligibleSquads;

  const merged = React.useMemo(() => {
    const p = parseCustomers(paste);
    const seen = new Set<string>();
    const customers: CampaignCustomer[] = [];
    for (const c of [...p.customers, ...(csv?.customers ?? [])]) {
      if (seen.has(c.number)) continue;
      seen.add(c.number);
      customers.push(c);
    }
    return { customers, invalid: p.invalid.length + (csv?.invalid ?? 0) };
  }, [paste, csv]);

  async function onCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const { customers, invalid } = parseCustomersCsv(text);
    setCsv({ customers, invalid: invalid.length, name: file.name });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name your campaign.");
    if (!phoneId) return toast.error("Pick a phone number.");
    if (!targetId)
      return toast.error(`Pick ${targetKind === "agent" ? "an agent" : "a squad"}.`);
    if (!merged.customers.length)
      return toast.error("Add at least one valid recipient (E.164).");

    setSubmitting(true);
    try {
      const row = await createCampaign({
        name: name.trim(),
        phoneNumberId: phoneId,
        targetKind,
        targetId,
        customers: merged.customers,
        scheduleEarliestAt: schedule
          ? new Date(schedule).toISOString()
          : null,
      });
      toast.success("Campaign created");
      void invalidateAll();
      router.replace(`/campaigns/${row.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create campaign.");
      setSubmitting(false);
    }
  }

  const gateMessage = !hasBackendApi()
    ? "Sign in to a workspace to create campaigns."
    : twilioNumbers.length === 0
      ? "Import a Twilio number first — outbound campaigns run on Twilio (Vapi numbers can't)."
      : targetOptions.length === 0 && eligibleAgents.length === 0 && eligibleSquads.length === 0
        ? "Create an agent or squad first."
        : null;

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6">
      <div className="grid gap-3">
        <Link
          href="/campaigns"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition"
        >
          <ArrowLeftIcon className="size-4" /> Campaigns
        </Link>
        <PageHeader
          eyebrow="Build"
          title="New campaign"
          description="Dial a recipient list from a Twilio number using one of your agents or squads."
        />
      </div>

      {gateMessage ? (
        <Card>
          <CardContent className="grid gap-4 py-8 text-center">
            <p className="text-muted-foreground text-sm">{gateMessage}</p>
            {twilioNumbers.length === 0 && hasBackendApi() ? (
              <Button asChild size="sm" className="justify-self-center">
                <Link href="/phone-numbers">Import a number</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={onSubmit}>
          <Card>
            <CardContent className="grid gap-5 py-6">
              <div className="grid gap-2">
                <Label htmlFor="campaign-name">Name</Label>
                <Input
                  id="campaign-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Q3 outreach"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Call from</Label>
                  <Select value={phoneId} onValueChange={setPhoneId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a Twilio number" />
                    </SelectTrigger>
                    <SelectContent>
                      {twilioNumbers.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name ? `${p.name} · ${p.number}` : p.number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="campaign-schedule">Schedule start (optional)</Label>
                  <Input
                    id="campaign-schedule"
                    type="datetime-local"
                    value={schedule}
                    onChange={(e) => setSchedule(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Answered by</Label>
                  <Select
                    value={targetKind}
                    onValueChange={(v) => {
                      setTargetKind(v as TargetKind);
                      setTargetId("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agent">An agent</SelectItem>
                      <SelectItem value="squad">A squad</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>{targetKind === "agent" ? "Agent" : "Squad"}</Label>
                  <Select value={targetId} onValueChange={setTargetId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {targetOptions.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="recipients">Recipients</Label>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">
                      {merged.customers.length} valid
                      {merged.invalid > 0 ? (
                        <span className="text-destructive">
                          {" "}
                          · {merged.invalid} invalid
                        </span>
                      ) : null}
                    </span>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="text-foreground inline-flex items-center gap-1 hover:underline"
                    >
                      <UploadIcon className="size-3.5" /> Upload CSV
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={onCsv}
                    />
                  </div>
                </div>
                <Textarea
                  id="recipients"
                  value={paste}
                  onChange={(e) => setPaste(e.target.value)}
                  rows={6}
                  placeholder={"+14155550123, Jane Doe\n+998901234567"}
                  className="font-mono text-sm"
                />
                <p className="text-muted-foreground text-xs">
                  One per line: E.164 number, optional name. CSV (with a
                  number/phone column, optional name) merges in.
                  {csv ? ` Loaded ${csv.name}.` : ""}
                </p>
              </div>

              <div className="border-border/50 flex justify-end gap-3 border-t pt-5">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.back()}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="gap-1.5">
                  {submitting ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <SendIcon className="size-4" />
                  )}
                  Create campaign
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}
