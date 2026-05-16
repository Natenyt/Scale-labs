"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckIcon,
  DatabaseIcon,
  ExternalLinkIcon,
  PlusIcon,
  UnplugIcon,
} from "lucide-react";

import { useIntegrations } from "@/components/integrations/integrations-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { NotionIntegration } from "@/lib/integrations/types";
import type { Agent, WriteBackPolicy } from "@/lib/agents/types";

import { FieldRow, SectionShell } from "./section-shell";

type Props = {
  agent: Agent;
  onChange: (patch: Partial<Agent>) => void;
};

export function SectionCrm({ agent, onChange }: Props) {
  const { byKind, byId, ready } = useIntegrations();
  const notionConnections = byKind("notion") as NotionIntegration[];
  const bound = agent.integrationId
    ? (byId(agent.integrationId) as NotionIntegration | undefined)
    : undefined;
  const isConnected = !!bound;

  const toggleField = (field: string) => {
    const next = agent.contextFields.includes(field)
      ? agent.contextFields.filter((f) => f !== field)
      : [...agent.contextFields, field];
    onChange({ contextFields: next });
  };

  const bindToIntegration = (integrationId: string) => {
    const target = byId(integrationId) as NotionIntegration | undefined;
    if (!target) return;
    const defaultLookup =
      target.fieldMap.find((f) =>
        f.notionPropertyName.toLowerCase().includes("phone"),
      ) ??
      target.fieldMap.find((f) => f.loadIntoContext) ??
      target.fieldMap[0];
    onChange({
      integrationId: target.id,
      lookupField: defaultLookup?.notionPropertyName ?? null,
      contextFields: target.fieldMap
        .filter((f) => f.loadIntoContext)
        .map((f) => f.notionPropertyName),
    });
  };

  const unbind = () => {
    onChange({
      integrationId: null,
      lookupField: null,
      contextFields: [],
    });
  };

  return (
    <SectionShell
      id="crm"
      title="CRM context"
      description="Bind this agent to a connected CRM. Records load automatically by phone number when calls start."
      action={
        <Button asChild size="sm" variant="outline" className="h-8 gap-1.5">
          <Link href="/integrations">
            Manage integrations
            <ExternalLinkIcon className="size-3" />
          </Link>
        </Button>
      }
    >
      <FieldRow
        label="Connection"
        description="Pick one of your configured Notion connections. Each connection binds to a single database."
      >
        {!ready ? (
          <div className="border-border/40 h-16 animate-pulse rounded-lg border" />
        ) : notionConnections.length === 0 ? (
          <EmptyConnections />
        ) : (
          <div className="grid gap-2">
            <Select
              value={agent.integrationId ?? "none"}
              onValueChange={(v) => {
                if (v === "none") unbind();
                else bindToIntegration(v);
              }}
            >
              <SelectTrigger className="w-full sm:w-96">
                <SelectValue placeholder="No CRM connection" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">No connection</span>
                </SelectItem>
                {notionConnections.map((conn) => (
                  <SelectItem key={conn.id} value={conn.id}>
                    <div className="flex items-center gap-2">
                      <DatabaseIcon className="size-3.5" />
                      <span>{conn.label}</span>
                      <span className="text-muted-foreground text-xs">
                        ·  {conn.databaseTitle}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {bound && (
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-500/10 text-[10px] font-medium uppercase tracking-wider text-emerald-300"
                >
                  Connected
                </Badge>
                <span className="text-muted-foreground text-xs">
                  Database <strong className="text-foreground font-medium">{bound.databaseTitle}</strong>, {bound.fieldMap.length} fields available.
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground gap-1.5"
                  onClick={unbind}
                >
                  <UnplugIcon className="size-3.5" />
                  Disconnect
                </Button>
              </div>
            )}
          </div>
        )}
      </FieldRow>

      {isConnected && bound && (
        <>
          <FieldRow
            label="Lookup key"
            description="Field used to find a record from the inbound caller's number."
            htmlFor="agent-crm-lookup"
          >
            <Select
              value={agent.lookupField ?? ""}
              onValueChange={(v) => onChange({ lookupField: v })}
            >
              <SelectTrigger id="agent-crm-lookup" className="w-full sm:w-72">
                <SelectValue placeholder="Pick a field" />
              </SelectTrigger>
              <SelectContent>
                {bound.fieldMap.map((f) => (
                  <SelectItem
                    key={f.notionPropertyId}
                    value={f.notionPropertyName}
                  >
                    <div className="flex items-center gap-2">
                      <span>{f.notionPropertyName}</span>
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-normal"
                      >
                        {f.notionType}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>

          <FieldRow
            label="Context fields"
            description="Loaded into the agent's memory at the start of each call."
          >
            <div className="flex flex-wrap gap-2">
              {bound.fieldMap.map((f) => {
                const active = agent.contextFields.includes(
                  f.notionPropertyName,
                );
                return (
                  <button
                    key={f.notionPropertyId}
                    type="button"
                    onClick={() => toggleField(f.notionPropertyName)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition",
                      active
                        ? "border-foreground/40 bg-accent text-foreground"
                        : "border-input text-muted-foreground hover:bg-accent/40 hover:text-foreground",
                    )}
                  >
                    {active ? (
                      <CheckIcon className="size-3" />
                    ) : (
                      <PlusIcon className="size-3" />
                    )}
                    {f.notionPropertyName}
                  </button>
                );
              })}
            </div>
            {agent.contextFields.length === 0 && (
              <p className="text-muted-foreground mt-2 text-xs">
                Pick at least one field so the agent has context to use.
              </p>
            )}
          </FieldRow>

          <FieldRow
            label="Write-back policy"
            description="What gets saved back to the CRM after each call. Writebacks run via workflows; this is the default for the agent."
          >
            <RadioGroup
              value={agent.writeBack}
              onValueChange={(v) =>
                onChange({ writeBack: v as WriteBackPolicy })
              }
              className="gap-2"
            >
              {[
                {
                  id: "off" as WriteBackPolicy,
                  title: "Off",
                  desc: "Agent reads from CRM but does not write anything back.",
                },
                {
                  id: "summary" as WriteBackPolicy,
                  title: "Summary only",
                  desc: "Save a short call summary and outcome.",
                },
                {
                  id: "full" as WriteBackPolicy,
                  title: "Full transcript + summary",
                  desc: "Append the full transcript plus a structured summary.",
                },
              ].map((opt) => (
                <label
                  key={opt.id}
                  htmlFor={`crm-wb-${opt.id}`}
                  className={cn(
                    "border-input hover:bg-accent/30 flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition",
                    agent.writeBack === opt.id &&
                      "border-foreground/40 bg-accent/40",
                  )}
                >
                  <RadioGroupItem
                    value={opt.id}
                    id={`crm-wb-${opt.id}`}
                    className="mt-0.5"
                  />
                  <div className="grid gap-0.5">
                    <div className="text-sm font-medium">{opt.title}</div>
                    <p className="text-muted-foreground text-xs">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </FieldRow>

          <div className="border-border/40 bg-muted/20 flex items-center gap-3 rounded-lg border px-3 py-2">
            <Badge variant="secondary" className="font-normal">
              Tip
            </Badge>
            <p className="text-muted-foreground text-xs">
              The agent looks up records by the caller&apos;s phone number using
              the{" "}
              <strong className="text-foreground">
                {agent.lookupField ?? "—"}
              </strong>{" "}
              field, then loads the selected context fields into the
              conversation before it speaks.
            </p>
          </div>
        </>
      )}
    </SectionShell>
  );
}

function EmptyConnections() {
  return (
    <div className="border-border/40 grid place-items-start gap-2 rounded-lg border border-dashed px-4 py-5">
      <p className="text-sm font-medium">No CRM connections yet</p>
      <p className="text-muted-foreground text-xs">
        Add a Notion connection on the Integrations page, then come back here
        to bind it to this agent.
      </p>
      <Button asChild variant="outline" size="sm" className="mt-1 gap-1.5">
        <Link href="/integrations/notion/new">
          <PlusIcon className="size-3.5" />
          Add Notion connection
        </Link>
      </Button>
    </div>
  );
}
