"use client";

import * as React from "react";
import Vapi from "@vapi-ai/web";

import { AgentPicker } from "@/components/agents/agent-picker";
import { apiFetch } from "@/lib/api/client";
import { hasBackendApi } from "@/lib/api/env";
import { Button } from "@/components/ui/button";

export default function CallsPage() {
  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY?.trim() ?? "";
  const [agentId, setAgentId] = React.useState("");
  const [status, setStatus] = React.useState<string | null>(null);
  const vapiRef = React.useRef<Vapi | null>(null);

  React.useEffect(() => {
    return () => {
      void vapiRef.current?.stop();
    };
  }, []);

  async function startCall() {
    if (!hasBackendApi()) {
      setStatus("Set NEXT_PUBLIC_API_BASE_URL and sign in.");
      return;
    }
    if (!agentId) {
      setStatus("Select an agent.");
      return;
    }
    setStatus(null);
    try {
      const cfg = await apiFetch<{
        publicKey: string;
        assistantId: string | null;
        workflowId: string | null;
      }>("/api/v1/calls/web-config/", {
        method: "POST",
        json: { agent_id: agentId },
      });
      const pk = cfg.publicKey || publicKey;
      if (!pk) {
        setStatus("Voice service is not configured on the server.");
        return;
      }
      const aid = cfg.assistantId;
      if (!aid) {
        setStatus("This agent is not linked to voice yet. Open the agent and sync first.");
        return;
      }
      const vapi = new Vapi(pk);
      vapiRef.current = vapi;
      vapi.on("call-start", () => setStatus("Call started"));
      vapi.on("call-end", () => setStatus("Call ended"));
      vapi.on("error", (e: unknown) => setStatus(`Error: ${String(e)}`));
      await vapi.start(aid);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Could not start call");
    }
  }

  async function stop() {
    await vapiRef.current?.stop();
    vapiRef.current = null;
    setStatus("Stopped");
  }

  return (
    <div className="mx-auto grid max-w-lg gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Browser calls</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Test a voice session with an agent from your workspace. Voice runs on the
          platform server — you never need an API key.
        </p>
      </div>
      <div className="border-border/60 bg-card/30 grid gap-4 rounded-xl border p-4">
        <AgentPicker value={agentId} onValueChange={setAgentId} />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={!agentId}
            onClick={() => void startCall()}
          >
            Start call
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => void stop()}>
            Stop
          </Button>
        </div>
        {status ? (
          <p className="text-muted-foreground text-xs">{status}</p>
        ) : null}
      </div>
    </div>
  );
}
