"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  Loader2Icon,
  PhoneOutgoingIcon,
} from "lucide-react";
import { toast } from "sonner";

import { useAgents } from "@/components/agents/agents-store";
import { PageHeader } from "@/components/page-header";
import { useCompleteNavigationWhenReady } from "@/components/navigation/navigation-pending";
import { useWorkflows } from "@/components/workflows/workflows-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { hasBackendApi } from "@/lib/api/env";
import {
  placeOutboundCall,
  type OutboundCallResult,
} from "@/lib/calls/outbound-call";
import { isDemoSession } from "@/lib/demo/constants";
import { usePhoneNumbersQuery } from "@/lib/query/use-phone-numbers-query";

type SourceKind = "agent" | "workflow";

const E164_HINT = "Use international format, e.g. +14155550123.";

function normalizeNumber(raw: string): string {
  return raw.replace(/[^\d+]/g, "");
}

function isLikelyE164(raw: string): boolean {
  const v = normalizeNumber(raw);
  return /^\+\d{8,15}$/.test(v);
}

export default function CallsPage() {
  const { agents, ready: agentsReady } = useAgents();
  const { workflows, ready: workflowsReady } = useWorkflows();
  const { data: phoneNumbers = [], isLoading: phonesLoading } =
    usePhoneNumbersQuery();

  const demo = isDemoSession();
  const apiReady = hasBackendApi();
  const ready = agentsReady && workflowsReady;
  useCompleteNavigationWhenReady(ready);

  const eligibleAgents = React.useMemo(
    () => agents.filter((a) => Boolean(a.vapiAssistantId)),
    [agents],
  );
  const eligibleWorkflows = React.useMemo(
    () => workflows.filter((w) => Boolean(w.vapiWorkflowId)),
    [workflows],
  );

  const [sourceKind, setSourceKind] = React.useState<SourceKind>("agent");
  const [agentId, setAgentId] = React.useState<string>("");
  const [workflowId, setWorkflowId] = React.useState<string>("");
  const [phoneNumberId, setPhoneNumberId] = React.useState<string>("");
  const [customerNumber, setCustomerNumber] = React.useState<string>("");
  const [placing, setPlacing] = React.useState(false);
  const [lastResult, setLastResult] = React.useState<OutboundCallResult | null>(
    null,
  );

  React.useEffect(() => {
    if (!agentId && eligibleAgents.length > 0) {
      setAgentId(eligibleAgents[0].id);
    }
  }, [eligibleAgents, agentId]);

  React.useEffect(() => {
    if (!workflowId && eligibleWorkflows.length > 0) {
      setWorkflowId(eligibleWorkflows[0].id);
    }
  }, [eligibleWorkflows, workflowId]);

  const sourceSelected =
    sourceKind === "agent" ? Boolean(agentId) : Boolean(workflowId);
  const numberValid = isLikelyE164(customerNumber);
  const canSubmit =
    !demo && apiReady && sourceSelected && numberValid && !placing;

  async function onPlaceCall(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setPlacing(true);
    try {
      const result = await placeOutboundCall({
        customerNumber: normalizeNumber(customerNumber),
        source:
          sourceKind === "agent"
            ? { kind: "agent", agentId }
            : { kind: "workflow", workflowId },
        phoneNumberId: phoneNumberId || undefined,
      });
      setLastResult(result);
      toast.success("Call placed", {
        description: `Dialing ${result.customer_number}.`,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not place call");
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 pt-4 md:pt-6">
      <PageHeader
        eyebrow="Build"
        title="Call"
        description="Place an outbound call from one of your agents or workflows to a real phone number."
      />

      {demo ? (
        <Card size="sm" className="border-dashed">
          <CardContent className="grid gap-2 py-6">
            <p className="font-medium">Demo workspace</p>
            <p className="text-muted-foreground text-sm">
              The demo workspace cannot place real outbound calls. Sign in to a
              real workspace to dial a live number.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {!apiReady ? (
        <Card size="sm" className="border-dashed">
          <CardContent className="py-6">
            <p className="text-muted-foreground text-sm">
              API is not configured. Set <code>NEXT_PUBLIC_API_BASE_URL</code>{" "}
              and reload.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Place a call</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-6" onSubmit={onPlaceCall}>
            <div className="grid gap-2">
              <Label>Source</Label>
              <Tabs
                value={sourceKind}
                onValueChange={(v) => setSourceKind(v as SourceKind)}
              >
                <TabsList>
                  <TabsTrigger value="agent">Agent</TabsTrigger>
                  <TabsTrigger value="workflow">Workflow</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {sourceKind === "agent" ? (
              <div className="grid gap-2">
                <Label htmlFor="call-agent">Agent</Label>
                <Select
                  value={agentId}
                  onValueChange={setAgentId}
                  disabled={eligibleAgents.length === 0}
                >
                  <SelectTrigger id="call-agent">
                    <SelectValue
                      placeholder={
                        eligibleAgents.length === 0
                          ? "No agents synced to the voice runtime yet"
                          : "Pick an agent"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleAgents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {eligibleAgents.length === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    Create an agent on the{" "}
                    <Link href="/agents" className="underline">
                      Agents
                    </Link>{" "}
                    page first. The agent must be synced to the voice runtime.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="call-workflow">Workflow</Label>
                <Select
                  value={workflowId}
                  onValueChange={setWorkflowId}
                  disabled={eligibleWorkflows.length === 0}
                >
                  <SelectTrigger id="call-workflow">
                    <SelectValue
                      placeholder={
                        eligibleWorkflows.length === 0
                          ? "No workflows published to the voice runtime yet"
                          : "Pick a workflow"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleWorkflows.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {eligibleWorkflows.length === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    Publish a workflow from the{" "}
                    <Link href="/workflow" className="underline">
                      Workflow
                    </Link>{" "}
                    page first.
                  </p>
                ) : null}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="call-number">Customer number</Label>
              <Input
                id="call-number"
                inputMode="tel"
                autoComplete="off"
                placeholder="+14155550123"
                value={customerNumber}
                onChange={(e) => setCustomerNumber(e.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                {customerNumber && !numberValid
                  ? `Doesn't look like a valid number. ${E164_HINT}`
                  : E164_HINT}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="call-from">From (caller ID)</Label>
              <Select
                value={phoneNumberId || "__auto__"}
                onValueChange={(v) =>
                  setPhoneNumberId(v === "__auto__" ? "" : v)
                }
                disabled={phonesLoading}
              >
                <SelectTrigger id="call-from">
                  <SelectValue
                    placeholder={
                      phonesLoading ? "Loading…" : "Workspace default"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__auto__">Workspace default</SelectItem>
                  {phoneNumbers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {p.number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Optional. Pick which of your workspace numbers should appear on
                the customer&apos;s phone.
              </p>
            </div>

            <div className="flex items-center justify-end">
              <Button type="submit" disabled={!canSubmit}>
                {placing ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <PhoneOutgoingIcon className="size-4" />
                )}
                Place call
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {lastResult ? (
        <Card>
          <CardHeader>
            <CardTitle>Last call</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5">
              <span className="text-muted-foreground">Status</span>
              <span>{lastResult.status}</span>
              <span className="text-muted-foreground">Customer</span>
              <span className="font-mono tabular-nums">
                {lastResult.customer_number}
              </span>
              <span className="text-muted-foreground">Call ID</span>
              <span className="font-mono break-all text-xs">
                {lastResult.vapi_call_id || lastResult.id}
              </span>
              <span className="text-muted-foreground">Placed</span>
              <span>{new Date(lastResult.created_at).toLocaleString()}</span>
            </div>
            {lastResult.vapi_call_id ? (
              <div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/logs/${encodeURIComponent(lastResult.vapi_call_id)}`}>
                    View in logs
                    <ArrowRightIcon className="size-3.5" />
                  </Link>
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
