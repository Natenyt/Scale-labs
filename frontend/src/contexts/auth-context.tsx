"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "@/lib/api/client";
import { clearClientStores } from "@/lib/api/clear-client-stores";
import { hasBackendApi } from "@/lib/api/env";
import { hydrateStoresFromDjango } from "@/lib/api/django";
import {
  clearTokens,
  getAccessToken,
  setActiveOrgId,
  setTokens,
} from "@/lib/api/tokens";

export type AuthUser = {
  id: number;
  email: string;
  organizations: { id: number; name: string; slug: string; kind: string }[];
};

type AuthContextValue = {
  user: AuthUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
};

export type RegisterInput = {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  account_type: "individual" | "organization";
  organization_name?: string;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!hasBackendApi()) {
        if (!cancelled) setReady(true);
        return;
      }
      if (!getAccessToken()) {
        if (!cancelled) setReady(true);
        return;
      }
      try {
        const me = await apiFetch<{
          id: number;
          email: string;
          organizations: AuthUser["organizations"];
          last_active_organization: number | null;
        }>("/api/v1/auth/me/");
        if (cancelled) return;
        setUser({
          id: me.id,
          email: me.email,
          organizations: me.organizations,
        });
        if (me.last_active_organization != null) {
          setActiveOrgId(String(me.last_active_organization));
        } else if (me.organizations[0]) {
          setActiveOrgId(String(me.organizations[0].id));
        }
        clearClientStores();
        await hydrateStoresFromDjango();
      } catch {
        if (!cancelled) {
          clearTokens();
          setUser(null);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = React.useCallback(
    async (email: string, password: string) => {
      clearClientStores();
      const res = await apiFetch<{
        access: string;
        refresh: string;
        user: AuthUser;
      }>("/api/v1/auth/login/", {
        method: "POST",
        json: { email, password },
      });
      setTokens(res.access, res.refresh);
      setUser(res.user);
      const org =
        res.user.organizations[0]?.id != null
          ? String(res.user.organizations[0].id)
          : null;
      if (org) setActiveOrgId(org);
      await hydrateStoresFromDjango();
      router.push("/dashboard");
    },
    [router],
  );

  const register = React.useCallback(
    async (input: RegisterInput) => {
      clearClientStores();
      const res = await apiFetch<{
        access: string;
        refresh: string;
        user: AuthUser;
      }>("/api/v1/auth/register/", {
        method: "POST",
        json: input,
      });
      setTokens(res.access, res.refresh);
      setUser(res.user);
      const org =
        res.user.organizations[0]?.id != null
          ? String(res.user.organizations[0].id)
          : null;
      if (org) setActiveOrgId(org);
      await hydrateStoresFromDjango();
      router.push("/dashboard");
    },
    [router],
  );

  const logout = React.useCallback(() => {
    clearTokens();
    clearClientStores();
    setUser(null);
    router.push("/login");
  }, [router]);

  const value = React.useMemo(
    () => ({ user, ready, login, register, logout }),
    [user, ready, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
