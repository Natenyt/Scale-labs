export const queryKeys = {
  metrics: (p: { days: number; step: string; agentId?: string }) =>
    ["metrics", p] as const,
  callLogs: (p: { days: number; limit?: number; agentId?: string }) =>
    ["callLogs", p] as const,
  callLog: (id: string) => ["callLog", id] as const,
  phoneNumbers: () => ["phoneNumbers"] as const,
  phoneNumber: (id: string) => ["phoneNumber", id] as const,
};
