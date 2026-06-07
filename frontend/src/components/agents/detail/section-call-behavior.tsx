"use client";

import {
  ClockIcon,
  KeyboardIcon,
  MicIcon,
  PhoneCallIcon,
  ScrollTextIcon,
  TimerIcon,
  VoicemailIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  type Agent,
  type RecordingFormat,
  type VoicemailAction,
} from "@/lib/agents/types";

import { FieldRow, SectionShell, ToggleRow } from "./section-shell";

type Props = {
  agent: Agent;
  onChange: (patch: Partial<Agent>) => void;
};

export function SectionCallBehavior({ agent, onChange }: Props) {
  return (
    <SectionShell
      id="call-behavior"
      title="Call behavior"
      description="How the agent handles calls — voicemail, recording, timeouts and keypad input."
    >
      <div className="grid">
        <ToggleRow
          icon={<VoicemailIcon className="size-4" />}
          title="Voicemail detection"
          description="Detect when an answering machine picks up and react automatically."
          control={
            <div className="flex items-center gap-2">
              {agent.voicemailDetection && (
                <Select
                  value={agent.voicemailAction}
                  onValueChange={(v) =>
                    onChange({ voicemailAction: v as VoicemailAction })
                  }
                >
                  <SelectTrigger size="sm" className="h-7 w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hangup">Hang up</SelectItem>
                    <SelectItem value="leave_message">Leave message</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Switch
                checked={agent.voicemailDetection}
                onCheckedChange={(v) => onChange({ voicemailDetection: v })}
                aria-label="Voicemail detection"
              />
            </div>
          }
        />

        {agent.voicemailDetection &&
        agent.voicemailAction === "leave_message" ? (
          <div className="border-border/50 grid gap-1.5 border-b py-3 pl-11">
            <label
              htmlFor="agent-voicemail-message"
              className="text-muted-foreground text-xs"
            >
              Voicemail message
            </label>
            <Textarea
              id="agent-voicemail-message"
              value={agent.voicemailMessage}
              rows={2}
              placeholder="Hi, this is a courtesy call from Scale Labs — sorry we missed you. We'll try again soon."
              onChange={(e) => onChange({ voicemailMessage: e.target.value })}
            />
          </div>
        ) : null}

        <ToggleRow
          icon={<MicIcon className="size-4" />}
          title="Audio recording"
          description="Save audio of every call for later review."
          control={
            <div className="flex items-center gap-2">
              {agent.recording && (
                <Select
                  value={agent.recordingFormat}
                  onValueChange={(v) =>
                    onChange({ recordingFormat: v as RecordingFormat })
                  }
                >
                  <SelectTrigger size="sm" className="h-7 w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wav">WAV</SelectItem>
                    <SelectItem value="mp3">MP3</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Switch
                checked={agent.recording}
                onCheckedChange={(v) => onChange({ recording: v })}
                aria-label="Audio recording"
              />
            </div>
          }
        />

        <ToggleRow
          icon={<ScrollTextIcon className="size-4" />}
          title="Live transcription"
          description="Generate a written transcript while the call happens."
          control={
            <Switch
              checked={agent.transcript}
              onCheckedChange={(v) => onChange({ transcript: v })}
              aria-label="Live transcription"
            />
          }
        />

        <ToggleRow
          icon={<KeyboardIcon className="size-4" />}
          title="Keypad input (DTMF)"
          description="Allow the caller to press numbers (e.g. for menus or PINs)."
          control={
            <Switch
              checked={agent.dtmf}
              onCheckedChange={(v) => onChange({ dtmf: v })}
              aria-label="Keypad input"
            />
          }
        />
      </div>

      <FieldRow
        label={
          <span className="inline-flex items-center gap-2">
            <ClockIcon className="text-muted-foreground size-4" />
            Max call duration
          </span>
        }
        description="The agent will politely wrap up calls that go past this limit."
      >
        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">1 min</span>
            <Badge variant="secondary" className="tabular-nums">
              {agent.maxCallMinutes} min
            </Badge>
            <span className="text-muted-foreground text-xs">30 min</span>
          </div>
          <Slider
            value={[agent.maxCallMinutes]}
            min={1}
            max={30}
            step={1}
            onValueChange={(v) => onChange({ maxCallMinutes: v[0] })}
          />
        </div>
      </FieldRow>

      <FieldRow
        label={
          <span className="inline-flex items-center gap-2">
            <TimerIcon className="text-muted-foreground size-4" />
            Idle timeout
          </span>
        }
        description="If the caller stays silent for this long, the agent will check in."
      >
        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">5 sec</span>
            <Badge variant="secondary" className="tabular-nums">
              {agent.idleTimeoutSeconds} sec
            </Badge>
            <span className="text-muted-foreground text-xs">60 sec</span>
          </div>
          <Slider
            value={[agent.idleTimeoutSeconds]}
            min={5}
            max={60}
            step={5}
            onValueChange={(v) => onChange({ idleTimeoutSeconds: v[0] })}
          />
        </div>
      </FieldRow>

      <div className="border-border/40 bg-muted/20 flex items-center gap-3 rounded-lg border px-3 py-2">
        <PhoneCallIcon className="text-muted-foreground size-4" />
        <p className="text-muted-foreground text-xs">
          These settings apply to every call this agent answers or initiates.
        </p>
      </div>
    </SectionShell>
  );
}
