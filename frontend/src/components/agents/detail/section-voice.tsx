"use client";

import * as React from "react";
import { CheckIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { getVoicesForLanguage, type Agent } from "@/lib/agents/types";

import { SectionShell } from "./section-shell";

type Props = {
  agent: Agent;
  onChange: (patch: Partial<Agent>) => void;
};

export function SectionVoice({ agent, onChange }: Props) {
  const voices = React.useMemo(
    () => getVoicesForLanguage(agent.language),
    [agent.language],
  );

  return (
    <SectionShell
      id="voice"
      title="Voice"
      description="Pick how the agent sounds and how fast it speaks. Hear each voice on a test call."
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {voices.map((voice) => {
          const selected = voice.id === agent.voiceId;
          return (
            <button
              key={voice.id}
              type="button"
              onClick={() => onChange({ voiceId: voice.id })}
              className={cn(
                "border-input bg-card text-card-foreground flex items-center justify-between gap-2 rounded-xl border p-3 text-left transition",
                "hover:bg-accent/40 focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                selected
                  ? "border-foreground/40 ring-foreground/20 bg-accent/40 ring-2"
                  : "ring-1 ring-transparent",
              )}
            >
              <div className="flex min-w-0 items-center gap-2">
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-medium",
                    voice.gender === "female"
                      ? "bg-pink-500/10 text-pink-300"
                      : "bg-sky-500/10 text-sky-300",
                  )}
                >
                  {voice.name[0]}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium">{voice.name}</div>
                  <div className="text-muted-foreground truncate text-[11px]">
                    {voice.description}
                  </div>
                </div>
              </div>
              {selected && (
                <div className="bg-foreground text-background flex size-5 shrink-0 items-center justify-center rounded-full">
                  <CheckIcon className="size-3" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="border-border/50 grid gap-4 border-t pt-5">
        <div className="flex items-center justify-between">
          <div className="grid gap-1">
            <div className="text-sm font-medium">Speech speed</div>
            <p className="text-muted-foreground text-xs">
              How fast the agent talks. 1.0× is natural pace.
            </p>
          </div>
          <Badge variant="secondary" className="tabular-nums">
            {agent.speed.toFixed(2)}×
          </Badge>
        </div>
        <Slider
          value={[agent.speed]}
          min={0.7}
          max={1.2}
          step={0.05}
          onValueChange={(v) => onChange({ speed: Number(v[0].toFixed(2)) })}
        />
        <div className="text-muted-foreground flex justify-between text-[11px]">
          <span>Slower 0.7×</span>
          <span>Faster 1.2×</span>
        </div>
      </div>
    </SectionShell>
  );
}
