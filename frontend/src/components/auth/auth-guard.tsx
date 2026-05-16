"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import { hasBackendApi } from "@/lib/api/env";
import { getAccessToken } from "@/lib/api/tokens";
import { useAuth } from "@/contexts/auth-context";

/**
 * When `NEXT_PUBLIC_API_BASE_URL` is set, require a JWT before showing the app shell.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { ready, user } = useAuth();

  React.useEffect(() => {
    if (!hasBackendApi()) return;
    if (!ready) return;
    const authed = Boolean(user ?? getAccessToken());
    if (!authed && pathname !== "/login" && pathname !== "/register") {
      router.replace("/login");
    }
  }, [ready, user, pathname, router]);

  if (hasBackendApi() && !ready) {
    return (
      <div className="text-muted-foreground grid min-h-[40vh] place-items-center text-sm">
        Loading…
      </div>
    );
  }

  if (
    hasBackendApi() &&
    ready &&
    !(user ?? getAccessToken()) &&
    pathname !== "/login" &&
    pathname !== "/register"
  ) {
    return null;
  }

  return <>{children}</>;
}
