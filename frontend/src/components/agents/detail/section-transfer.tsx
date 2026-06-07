"use client";

import * as React from "react";
import { PhoneForwardedIcon, PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  type Agent,
  type TransferDestination,
  type TransferMode,
} from "@/lib/agents/types";

import { SectionShell, ToggleRow } from "./section-shell";

type Props = {
  agent: Agent;
  onChange: (patch: Partial<Agent>) => void;
};

function newDestination(): TransferDestination {
  return {
    id: `d_${Math.random().toString(36).slice(2, 9)}`,
    name: "",
    number: "",
    message: "",
    mode: "warm",
  };
}

export function SectionTransfer({ agent, onChange }: Props) {
  const destinations = agent.transferDestinations ?? [];

  const setDestinations = (next: TransferDestination[]) =>
    onChange({ transferDestinations: next });

  const update = (id: string, patch: Partial<TransferDestination>) =>
    setDestinations(
      destinations.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    );

  const add = () => setDestinations([...destinations, newDestination()]);
  const remove = (id: string) =>
    setDestinations(destinations.filter((d) => d.id !== id));

  return (
    <SectionShell
      id="transfer"
      title="Call transfer"
      description="Let the agent hand a live call to a person. It picks the right destination from the names and your prompt."
    >
      <ToggleRow
        icon={<PhoneForwardedIcon className="size-4" />}
        title="Allow the agent to transfer calls"
        description="When on, the agent can forward the caller to one of the phone numbers below."
        control={
          <Switch
            checked={agent.transferEnabled}
            onCheckedChange={(v) => {
              const patch: Partial<Agent> = { transferEnabled: v };
              if (v && destinations.length === 0) {
                patch.transferDestinations = [newDestination()];
              }
              onChange(patch);
            }}
            aria-label="Allow call transfer"
          />
        }
      />

      {agent.transferEnabled ? (
        <div className="grid gap-3">
          {destinations.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              No destinations yet. Add at least one phone number the agent can
              transfer to.
            </p>
          ) : (
            destinations.map((d, i) => (
              <div
                key={d.id}
                className="border-border/50 bg-muted/10 grid gap-3 rounded-xl border p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
                    Destination {i + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive size-7"
                    onClick={() => remove(d.id)}
                    aria-label="Remove destination"
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <label className="text-muted-foreground text-xs">
                      Label
                    </label>
                    <Input
                      value={d.name}
                      placeholder="Billing team"
                      onChange={(e) => update(d.id, { name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-muted-foreground text-xs">
                      Phone number
                    </label>
                    <Input
                      value={d.number}
                      placeholder="+1 415 555 0123"
                      inputMode="tel"
                      onChange={(e) => update(d.id, { number: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <label className="text-muted-foreground text-xs">
                    What the agent says before transferring (optional)
                  </label>
                  <Input
                    value={d.message}
                    placeholder="Connecting you to our billing team now."
                    onChange={(e) => update(d.id, { message: e.target.value })}
                  />
                </div>

                <div className="grid gap-1.5">
                  <label className="text-muted-foreground text-xs">
                    Transfer style
                  </label>
                  <Select
                    value={d.mode}
                    onValueChange={(v) =>
                      update(d.id, { mode: v as TransferMode })
                    }
                  >
                    <SelectTrigger className="w-full sm:w-72">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="warm">
                        <div className="grid">
                          <span>Warm — brief the person first</span>
                          <span className="text-muted-foreground text-xs">
                            The agent summarizes the call before handing over.
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="blind">
                        <div className="grid">
                          <span>Blind — transfer immediately</span>
                          <span className="text-muted-foreground text-xs">
                            Connects right away with no summary.
                          </span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))
          )}

          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={add}
            >
              <PlusIcon className="size-4" />
              Add destination
            </Button>
          </div>

          <p className="text-muted-foreground text-[11px] leading-relaxed">
            Tip: reference these destinations in the agent prompt (e.g. “transfer
            to Billing for payment questions”) so the agent knows when to use
            each one.
          </p>
        </div>
      ) : null}
    </SectionShell>
  );
}
