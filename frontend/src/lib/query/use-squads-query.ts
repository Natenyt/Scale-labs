"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { hasBackendApi } from "@/lib/api/env";
import { queryKeys } from "@/lib/query/query-keys";
import { fetchSquad, fetchSquads } from "@/lib/squads/squads-api";

const SQUADS_STALE_MS = 60 * 1000;

export function useSquadsQuery() {
  return useQuery({
    queryKey: queryKeys.squads(),
    queryFn: fetchSquads,
    enabled: hasBackendApi(),
    staleTime: SQUADS_STALE_MS,
  });
}

export function useSquadQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.squad(id),
    queryFn: () => fetchSquad(id),
    enabled: hasBackendApi() && Boolean(id),
    staleTime: SQUADS_STALE_MS,
  });
}

export function useInvalidateSquads() {
  const queryClient = useQueryClient();
  return {
    invalidateAll: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.squads() }),
    invalidateDetail: (id: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.squad(id) }),
    removeDetail: (id: string) =>
      queryClient.removeQueries({ queryKey: queryKeys.squad(id) }),
  };
}
