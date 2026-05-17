"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/contexts/auth-context";
import { hasBackendApi } from "@/lib/api/env";
import { isDemoSession } from "@/lib/demo/constants";
import { getAccessToken } from "@/lib/api/tokens";

/**
 * When `NEXT_PUBLIC_API_BASE_URL` is set, require a JWT before showing the app shell.
 * Demo workspace uses session storage and does not need the API.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { ready, user } = useAuth();

  const authed = Boolean(user ?? getAccessToken() ?? isDemoSession());

  React.useEffect(() => {
    if (!ready) return;
    const onAuthPage = pathname === "/login" || pathname === "/register";
    if (!authed && !onAuthPage) {
      router.replace("/login");
    }
  }, [ready, authed, pathname, router]);

  if (!ready) {
    return (
      <div className="text-muted-foreground grid min-h-[40vh] place-items-center text-sm">
        Loading…
      </div>
    );
  }

  const onAuthPage = pathname === "/login" || pathname === "/register";
  if (!authed && !onAuthPage) {
    return null;
  }

  return <>{children}</>;
}
