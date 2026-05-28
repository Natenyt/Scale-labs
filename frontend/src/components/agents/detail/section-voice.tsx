"use client";

import * as React from "react";
import { CheckIcon, PlayIcon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  getVoicesForLanguage,
  type Agent,
  type Voice,
} from "@/lib/agents/types";

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

  // All voices use ElevenLabs Multilingual v2 (EN + RU + UZ from the same
  // pool). The language tab in the studio is a UX grouping, not a different
  // TTS provider. See backend `_voice_block` / `SCALE_VOICE_MAP`.
  const provider = "ElevenLabs Multilingual v2";

  const handlePlay = (voice: Voice) => {
    toast.info(`Sample for ${voice.name} not yet wired`, {
      description:
        "In-page audio previews ship next — use 'Test agent' for a live call with this voice.",
    });
  };

  return (
    <SectionShell
      id="voice"
      title="Voice"
      description="Pick how the agent sounds. Voice catalog adapts to the selected language."
      action={
        <Badge variant="outline" className="font-normal">
          Powered by {provider}
        </Badge>
      }
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {voices.map((voice) => {
          const selected = voice.id === agent.voiceId;
          return (
            <div
              key={voice.id}
              className={cn(
                "border-input bg-card text-card-foreground group/voice relative flex flex-col gap-3 rounded-xl border p-3 text-left transition",
                selected
                  ? "border-foreground/40 ring-foreground/20 bg-accent/40 ring-2"
                  : "ring-1 ring-transparent",
              )}
            >
              <button
                type="button"
                onClick={() => onChange({ voiceId: voice.id })}
                className={cn(
                  "flex w-full cursor-pointer items-center justify-between rounded-lg text-left transition",
                  "hover:bg-accent/40 focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                )}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex size-8 items-center justify-center rounded-lg text-sm font-medium",
                      voice.gender === "female"
                        ? "bg-pink-500/10 text-pink-300"
                        : "bg-sky-500/10 text-sky-300",
                    )}
                  >
                    {voice.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{voice.name}</div>
                    <div className="text-muted-foreground text-[11px] capitalize">
                      {voice.gender} · {voice.age}
                      {voice.accent ? ` · ${voice.accent}` : ""}
                    </div>
                  </div>
                </div>
                {selected && (
                  <div className="bg-foreground text-background flex size-5 items-center justify-center rounded-full">
                    <CheckIcon className="size-3" />
                  </div>
                )}
              </button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 w-full justify-start gap-2 text-xs"
                onClick={() => handlePlay(voice)}
              >
                <PlayIcon className="size-3" />
                Play sample
              </Button>
            </div>
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
          max={1.3}
          step={0.05}
          onValueChange={(v) => onChange({ speed: Number(v[0].toFixed(2)) })}
        />
        <div className="text-muted-foreground flex justify-between text-[11px]">
          <span>Slower 0.7×</span>
          <span>Faster 1.3×</span>
        </div>
      </div>
    </SectionShell>
  );
}
