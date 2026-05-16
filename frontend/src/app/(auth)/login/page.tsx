"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/contexts/auth-context";
import { hasBackendApi } from "@/lib/api/env";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!hasBackendApi()) {
      router.replace("/dashboard");
    }
  }, [router]);

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

  if (!hasBackendApi()) return null;

  return (
    <div className="border-border/60 bg-card/40 grid gap-6 rounded-xl border p-6 shadow-sm">
      <div className="grid gap-1 text-center">
        <h1 className="text-lg font-semibold tracking-tight">Sign in</h1>
        <p className="text-muted-foreground text-xs">
          Use the email and password for your Scale Labs account.
        </p>
      </div>
      <form className="grid gap-4" onSubmit={onSubmit}>
        <div className="grid gap-1">
          <Label htmlFor="email">Email</Label>
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
        <div className="grid gap-1">
          <Label htmlFor="password">Password</Label>
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
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="text-muted-foreground text-center text-xs">
        No account?{" "}
        <Link href="/register" className="text-primary underline-offset-4 hover:underline">
          Register
        </Link>
      </p>
    </div>
  );
}
