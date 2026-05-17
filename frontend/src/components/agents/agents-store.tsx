"use client";

import * as React from "react";
import { startTransition } from "react";
import { toast } from "sonner";

import { fromApiAgentRow, toApiConfig, type ApiAgentRow } from "@/lib/agents/api";
import { ensureAgentVoiceLinked } from "@/lib/agents/ensure-voice-linked";
import { fetchOrgAgentsFromApi } from "@/lib/agents/fetch-agents";
import { registerAgentsHydrate } from "@/lib/agents/hydrate-bridge";
import { apiFetch } from "@/lib/api/client";
import { hasBackendApi } from "@/lib/api/env";
import { isDemoSession } from "@/lib/demo/constants";
import { getDemoAgents } from "@/lib/demo/acme-presentation-data";
import { getAccessToken } from "@/lib/api/tokens";
import {
  type Agent,
  type AgentTemplate,
  type Language,
  makeAgentFromTemplate,
} from "@/lib/agents/types";

const PATCH_DEBOUNCE_MS = 650;

function canPersistAgentsToApi(): boolean {
  return hasBackendApi() && Boolean(getAccessToken()?.trim());
}

export type AgentsState = {
  agents: Agent[];
  ready: boolean;
  remote: boolean;
  apiAgentsLoadFailed: boolean;
};

export type AgentsActions = {
  getAgent: (id: string) => Agent | undefined;
  createAgent: (
    template: AgentTemplate,
    name: string,
    language: Language,
  ) => Promise<Agent>;
  updateAgent: (id: string, patch: Partial<Agent>) => void;
  deleteAgent: (id: string) => void;
  duplicateAgent: (id: string) => Promise<Agent | null>;
  setAgentVapiAssistantId: (id: string, vapiAssistantId: string | null) => void;
};

const AgentsStateContext = React.createContext<AgentsState | null>(null);
const AgentsActionsContext = React.createContext<AgentsActions | null>(null);

export function AgentsProvider({ children }: { children: React.ReactNode }) {
  const [agents, setAgents] = React.useState<Agent[]>([]);
  const [ready, setReady] = React.useState(false);
  const [remote, setRemote] = React.useState(false);
  const [apiAgentsLoadFailed, setApiAgentsLoadFailed] = React.useState(false);

  const agentsRef = React.useRef(agents);
  const remoteRef = React.useRef(remote);

  React.useEffect(() => {
    agentsRef.current = agents;
  }, [agents]);

  React.useEffect(() => {
    remoteRef.current = remote;
  }, [remote]);

  const patchTimersRef = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const hydratedFromLoginRef = React.useRef(false);

  React.useEffect(() => {
    return registerAgentsHydrate((payload) => {
      hydratedFromLoginRef.current = true;
      startTransition(() => {
        setAgents(payload.agents);
        setRemote(payload.remote);
        setApiAgentsLoadFailed(payload.apiAgentsLoadFailed);
        setReady(true);
      });
    });
  }, []);

  React.useEffect(() => {
    // Demo workspace: read agents directly from the demo dataset on every
    // mount. The hydrate bridge can race the provider on the first paint
    // (auth-context fires applyAgentsHydrate before this provider mounts and
    // registers its callback), so do not rely on it for the demo path.
    if (isDemoSession()) {
      startTransition(() => {
        setAgents(getDemoAgents());
        setRemote(true);
        setApiAgentsLoadFailed(false);
        setReady(true);
      });
      return;
    }

    if (!hasBackendApi()) {
      startTransition(() => {
        setAgents([]);
        setRemote(false);
        setApiAgentsLoadFailed(false);
        setReady(true);
      });
      return;
    }

    if (!getAccessToken()?.trim()) {
      startTransition(() => {
        setAgents([]);
        setRemote(false);
        setApiAgentsLoadFailed(false);
        setReady(true);
      });
      return;
    }

    if (hydratedFromLoginRef.current) {
      startTransition(() => setReady(true));
      return;
    }

    let cancelled = false;
    void (async () => {
      const { ok, agents: loaded } = await fetchOrgAgentsFromApi();
      if (cancelled) return;
      if (!ok) {
        toast.error("Could not load agents from the API.");
      }
      startTransition(() => {
        setAgents(loaded);
        setRemote(ok);
        setApiAgentsLoadFailed(!ok);
        setReady(true);
      });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    const timers = patchTimersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  const setAgentVapiAssistantId = React.useCallback(
    (id: string, vapiAssistantId: string | null) => {
      setAgents((prev) =>
        prev.map((a) => (a.id === id ? { ...a, vapiAssistantId } : a)),
      );
    },
    [],
  );

  const scheduleRemotePatch = React.useCallback((id: string, nextAgent: Agent) => {
    if (!canPersistAgentsToApi()) return;
    const existing = patchTimersRef.current.get(id);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => {
      patchTimersRef.current.delete(id);
      void (async () => {
        try {
          await apiFetch<ApiAgentRow>(`/api/v1/agents/${id}/`, {
            method: "PATCH",
            json: {
              name: nextAgent.name,
              config: toApiConfig(nextAgent),
            },
          });
        } catch (e) {
          const msg =
            e instanceof Error ? e.message : "Failed to sync agent to the server.";
          toast.error(msg);
        }
      })();
    }, PATCH_DEBOUNCE_MS);
    patchTimersRef.current.set(id, t);
  }, []);

  const stateValue = React.useMemo<AgentsState>(
    () => ({ agents, ready, remote, apiAgentsLoadFailed }),
    [agents, ready, remote, apiAgentsLoadFailed],
  );

  const actionsValue = React.useMemo<AgentsActions>(
    () => ({
      getAgent: (id) => agentsRef.current.find((a) => a.id === id),
      createAgent: async (template, name, language) => {
        if (!canPersistAgentsToApi()) {
          toast.error("Sign in to create agents on the server.");
          throw new Error("Not authenticated");
        }
        const draft = makeAgentFromTemplate(template, name, language);
        const row = await apiFetch<ApiAgentRow>("/api/v1/agents/", {
          method: "POST",
          json: {
            name: draft.name,
            config: toApiConfig(draft),
          },
        });
        const agent = await ensureAgentVoiceLinked(row);
        startTransition(() => {
          setAgents((prev) => [agent, ...prev]);
          setRemote(true);
          setApiAgentsLoadFailed(false);
        });
        return agent;
      },
      updateAgent: (id, patch) => {
        setAgents((prev) => {
          const next = prev.map((a) => (a.id === id ? { ...a, ...patch } : a));
          const updated = next.find((a) => a.id === id);
          if (updated && canPersistAgentsToApi()) scheduleRemotePatch(id, updated);
          return next;
        });
      },
      deleteAgent: (id) => {
        if (!canPersistAgentsToApi()) {
          toast.error("Sign in to delete agents.");
          return;
        }
        const timer = patchTimersRef.current.get(id);
        if (timer) {
          clearTimeout(timer);
          patchTimersRef.current.delete(id);
        }
        void (async () => {
          try {
            await apiFetch(`/api/v1/agents/${id}/`, { method: "DELETE" });
            setAgents((prev) => prev.filter((a) => a.id !== id));
          } catch {
            toast.error("Could not delete this agent on the server.");
          }
        })();
      },
      setAgentVapiAssistantId,
      duplicateAgent: async (id) => {
        const source = agentsRef.current.find((a) => a.id === id);
        if (!source) return null;
        if (!canPersistAgentsToApi()) {
          toast.error("Sign in to duplicate agents.");
          return null;
        }
        try {
          const dup: Agent = {
            ...source,
            name: `${source.name} (copy)`,
            status: "draft",
            vapiAssistantId: null,
            phoneNumber: null,
            minutesThisMonth: 0,
            last7Days: [0, 0, 0, 0, 0, 0, 0],
            lastCallAt: null,
            createdAt: new Date().toISOString(),
          };
          const row = await apiFetch<ApiAgentRow>("/api/v1/agents/", {
            method: "POST",
            json: {
              name: dup.name,
              config: toApiConfig(dup),
            },
          });
          const agent = fromApiAgentRow(row);
          startTransition(() => {
            setAgents((prev) => [agent, ...prev]);
            setRemote(true);
            setApiAgentsLoadFailed(false);
          });
          return agent;
        } catch {
          toast.error("Could not duplicate agent on the server.");
          return null;
        }
      },
    }),
    [scheduleRemotePatch, setAgentVapiAssistantId],
  );

  return (
    <AgentsStateContext.Provider value={stateValue}>
      <AgentsActionsContext.Provider value={actionsValue}>
        {children}
      </AgentsActionsContext.Provider>
    </AgentsStateContext.Provider>
  );
}

export function useAgentsState(): AgentsState {
  const ctx = React.useContext(AgentsStateContext);
  if (!ctx) {
    throw new Error("useAgentsState must be used inside <AgentsProvider>");
  }
  return ctx;
}

export function useAgentsActions(): AgentsActions {
  const ctx = React.useContext(AgentsActionsContext);
  if (!ctx) {
    throw new Error("useAgentsActions must be used inside <AgentsProvider>");
  }
  return ctx;
}

export function useAgents(): AgentsState & AgentsActions {
  return { ...useAgentsState(), ...useAgentsActions() };
}

export function useAgent(id: string): Agent | undefined {
  const { agents } = useAgentsState();
  return React.useMemo(
    () => agents.find((a) => a.id === id),
    [agents, id],
  );
}
