"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, WavesIcon } from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEMO_ACCOUNT_EMAIL,
  DEMO_ACCOUNT_PASSWORD,
  DEMO_ORG_NAME,
} from "@/lib/demo/constants";
import { hasBackendApi } from "@/lib/api/env";

export default function LoginPage() {
  const router = useRouter();
  const { login, user, ready } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (ready && user) {
      router.replace("/dashboard");
    }
  }, [ready, user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function signInDemo() {
    setEmail(DEMO_ACCOUNT_EMAIL);
    setPassword(DEMO_ACCOUNT_PASSWORD);
    setError(null);
    setLoading(true);
    try {
      await login(DEMO_ACCOUNT_EMAIL, DEMO_ACCOUNT_PASSWORD);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-2 text-center">
        <div className="mx-auto inline-flex items-center gap-2">
          <span className="bg-foreground text-background flex size-7 items-center justify-center rounded-md">
            <WavesIcon className="size-4" />
          </span>
          <span className="text-base font-semibold tracking-tight">Scale Labs</span>
        </div>
        <p className="text-muted-foreground text-xs">
          {hasBackendApi()
            ? "Sign in to your workspace"
            : "API URL not set — use the demo workspace below"}
        </p>
      </div>

      <button
        type="button"
        disabled={loading}
        onClick={() => void signInDemo()}
        className="group/demo border-border/50 bg-card hover:bg-card/80 disabled:opacity-60 grid gap-2 rounded-xl border p-4 text-left transition-colors"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-muted-foreground/80 text-[10px] font-medium uppercase tracking-[0.12em]">
            Presentation workspace
          </p>
          <ArrowRightIcon className="text-muted-foreground group-hover/demo:text-foreground size-3.5 transition-colors" />
        </div>
        <p className="text-sm font-medium">Open Acme Inc demo workspace</p>
        <p className="text-muted-foreground text-[11px] leading-relaxed">
          Sign in as{" "}
          <span className="text-foreground font-mono">{DEMO_ACCOUNT_EMAIL}</span>{" "}
          ({DEMO_ORG_NAME}) — Scale plan, 10 agents, workflows, call logs, and metrics
          pre-filled.
        </p>
      </button>

      <div className="text-muted-foreground/60 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-[10px] uppercase tracking-[0.14em]">
        <span className="bg-border/40 h-px w-full" />
        <span>Or</span>
        <span className="bg-border/40 h-px w-full" />
      </div>

      <div className="border-border/50 bg-card grid gap-5 rounded-xl border p-5">
        <div className="grid gap-1">
          <h1 className="text-sm font-semibold tracking-tight">Sign in</h1>
          <p className="text-muted-foreground text-[11px]">
            Use your Scale Labs account.
          </p>
        </div>
        <form className="grid gap-3" onSubmit={onSubmit}>
          <div className="grid gap-1.5">
            <Label htmlFor="email" className="text-xs">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-9"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="password" className="text-xs">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-9"
            />
          </div>
          {error ? (
            <p className="text-destructive text-center text-xs">{error}</p>
          ) : null}
          <Button type="submit" disabled={loading} className="mt-1 w-full">
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        {hasBackendApi() ? (
          <p className="text-muted-foreground text-center text-xs">
            No account?{" "}
            <Link
              href="/register"
              className="text-foreground underline underline-offset-2 hover:no-underline"
            >
              Register
            </Link>
          </p>
        ) : null}
      </div>

      <p className="text-muted-foreground/60 text-center font-mono text-[10px] tracking-tight">
        Demo password · {DEMO_ACCOUNT_PASSWORD}
      </p>
    </div>
  );
}
