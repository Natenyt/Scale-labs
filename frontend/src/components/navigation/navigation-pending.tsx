"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { hasRouteLoading } from "@/components/navigation/route-loading-for-path";

function normalizePath(path: string): string {
  const base = path.split("?")[0]?.split("#")[0] ?? path;
  if (base.length > 1 && base.endsWith("/")) {
    return base.slice(0, -1);
  }
  return base;
}

type NavigationPendingContextValue = {
  pendingPath: string | null;
  /** Sidebar highlight while route is transitioning (cleared when pathname catches up). */
  optimisticPath: string | null;
  startNavigation: (path: string) => void;
  completeNavigation: () => void;
};

const NavigationPendingContext =
  React.createContext<NavigationPendingContextValue | null>(null);

export function NavigationPendingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pendingPath, setPendingPath] = React.useState<string | null>(null);
  const [optimisticPath, setOptimisticPath] = React.useState<string | null>(null);

  const startNavigation = React.useCallback((path: string) => {
    const normalized = normalizePath(path);
    setOptimisticPath(normalized);
    if (hasRouteLoading(normalized)) {
      setPendingPath(normalized);
    }
  }, []);

  const completeNavigation = React.useCallback(() => {
    setPendingPath(null);
  }, []);

  const value = React.useMemo(
    () => ({
      pendingPath,
      optimisticPath,
      startNavigation,
      completeNavigation,
    }),
    [pendingPath, optimisticPath, startNavigation, completeNavigation],
  );

  return (
    <NavigationPendingContext.Provider value={value}>
      {children}
    </NavigationPendingContext.Provider>
  );
}

export function useNavigationPending() {
  const ctx = React.useContext(NavigationPendingContext);
  if (!ctx) {
    throw new Error("useNavigationPending must be used within NavigationPendingProvider");
  }
  return ctx;
}

/** Call when page data (or error / no-api) is ready so the route shell can reveal content. */
export function useCompleteNavigationWhenReady(ready: boolean) {
  const { completeNavigation } = useNavigationPending();

  React.useLayoutEffect(() => {
    if (ready) {
      completeNavigation();
    }
  }, [ready, completeNavigation]);
}

/** False while a route skeleton is showing — defer Recharts until the main column is visible. */
export function useNavigationSettled(): boolean {
  const { pendingPath } = useNavigationPending();
  return pendingPath === null;
}

export function useNavActivePath(): string {
  const pathname = usePathname();
  const { optimisticPath } = useNavigationPending();

  if (!optimisticPath) {
    return pathname ?? "";
  }
  if (!pathname) {
    return optimisticPath;
  }

  const target = normalizePath(optimisticPath);
  const current = normalizePath(pathname);
  if (current === target || current.startsWith(`${target}/`)) {
    return current;
  }

  return optimisticPath;
}
