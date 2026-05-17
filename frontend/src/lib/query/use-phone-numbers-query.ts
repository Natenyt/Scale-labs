"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { hasBackendApi } from "@/lib/api/env";
import {
  fetchPhoneNumber,
  fetchPhoneNumbers,
} from "@/lib/phone-numbers/phone-numbers-api";
import { queryKeys } from "@/lib/query/query-keys";

const PHONE_NUMBERS_STALE_MS = 2 * 60 * 1000;

export function usePhoneNumbersQuery() {
  return useQuery({
    queryKey: queryKeys.phoneNumbers(),
    queryFn: fetchPhoneNumbers,
    enabled: hasBackendApi(),
    staleTime: PHONE_NUMBERS_STALE_MS,
  });
}

export function usePhoneNumberQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.phoneNumber(id),
    queryFn: () => fetchPhoneNumber(id),
    enabled: hasBackendApi() && Boolean(id),
    staleTime: PHONE_NUMBERS_STALE_MS,
  });
}

export function useInvalidatePhoneNumbers() {
  const queryClient = useQueryClient();
  return {
    invalidateAll: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.phoneNumbers() }),
    invalidateDetail: (id: string) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.phoneNumber(id) }),
    removeDetail: (id: string) =>
      queryClient.removeQueries({ queryKey: queryKeys.phoneNumber(id) }),
  };
}
