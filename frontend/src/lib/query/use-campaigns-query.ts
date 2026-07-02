"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { hasBackendApi } from "@/lib/api/env";
import { fetchCampaign, fetchCampaigns } from "@/lib/campaigns/campaigns-api";
import { queryKeys } from "@/lib/query/query-keys";

const CAMPAIGNS_STALE_MS = 30 * 1000;

export function useCampaignsQuery() {
  return useQuery({
    queryKey: queryKeys.campaigns(),
    queryFn: fetchCampaigns,
    enabled: hasBackendApi(),
    staleTime: CAMPAIGNS_STALE_MS,
  });
}

export function useCampaignQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.campaign(id),
    queryFn: () => fetchCampaign(id),
    enabled: hasBackendApi() && Boolean(id),
    staleTime: CAMPAIGNS_STALE_MS,
  });
}

export function useInvalidateCampaigns() {
  const queryClient = useQueryClient();
  return {
    invalidateAll: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns() }),
    invalidateDetail: (id: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.campaign(id) }),
  };
}
