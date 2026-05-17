"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/contexts/auth-context";
import { hasBackendApi } from "@/lib/api/env";
import { isDemoSession } from "@/lib/demo/constants";
import { getAccessToken } from "@/lib/api/tokens";
import { prefetchObservePages } from "@/lib/query/prefetch-app-data";

/**
 * After login or session restore, warm React Query caches for common app pages.
 */
export function AppDataPrefetcher() {
  const { user, ready } = useAuth();
  const queryClient = useQueryClient();
  const prefetchedRef = React.useRef(false);

  React.useEffect(() => {
    const canPrefetch =
      isDemoSession() || (hasBackendApi() && Boolean(getAccessToken()?.trim()));
    if (!ready || !user || !canPrefetch) {
      return;
    }
    if (prefetchedRef.current) return;
    prefetchedRef.current = true;
    prefetchObservePages(queryClient);
  }, [ready, user, queryClient]);

  return null;
}
