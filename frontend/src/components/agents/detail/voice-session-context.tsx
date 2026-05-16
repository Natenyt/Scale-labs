"use client";

import * as React from "react";

import { useVoiceSession } from "@/lib/agents/use-voice-session";

type VoiceSessionValue = ReturnType<typeof useVoiceSession>;

const VoiceSessionContext = React.createContext<VoiceSessionValue | null>(null);

export function AgentVoiceSessionProvider({
  agentRecordId,
  enabled = true,
  children,
}: {
  agentRecordId: string;
  enabled?: boolean;
  children: React.ReactNode;
}) {
  const session = useVoiceSession(agentRecordId, { enabled });
  return (
    <VoiceSessionContext.Provider value={session}>
      {children}
    </VoiceSessionContext.Provider>
  );
}

export function useAgentVoiceSession(): VoiceSessionValue {
  const ctx = React.useContext(VoiceSessionContext);
  if (!ctx) {
    throw new Error("useAgentVoiceSession must be used inside AgentVoiceSessionProvider");
  }
  return ctx;
}
