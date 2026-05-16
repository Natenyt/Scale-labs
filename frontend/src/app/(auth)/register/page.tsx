"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/contexts/auth-context";
import type { RegisterInput } from "@/contexts/auth-context";
import { hasBackendApi } from "@/lib/api/env";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [accountType, setAccountType] = React.useState<
    RegisterInput["account_type"]
  >("individual");
  const [organizationName, setOrganizationName] = React.useState("");
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
      await register({
        email,
        password,
        account_type: accountType,
        organization_name:
          accountType === "organization" ? organizationName : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  if (!hasBackendApi()) return null;

  return (
    <div className="border-border/60 bg-card/40 grid gap-6 rounded-xl border p-6 shadow-sm">
      <div className="grid gap-1 text-center">
        <h1 className="text-lg font-semibold tracking-tight">Create account</h1>
        <p className="text-muted-foreground text-xs">
          Individual workspace or a company organization.
        </p>
      </div>
      <form className="grid gap-4" onSubmit={onSubmit}>
        <div className="grid gap-1">
          <Label>Account type</Label>
          <Select
            value={accountType}
            onValueChange={(v) =>
              setAccountType(v as RegisterInput["account_type"])
            }
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="individual">Individual</SelectItem>
              <SelectItem value="organization">Organization</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {accountType === "organization" ? (
          <div className="grid gap-1">
            <Label htmlFor="org">Organization name</Label>
            <Input
              id="org"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              required
              className="h-9"
            />
          </div>
        ) : null}
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
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="h-9"
          />
        </div>
        {error ? (
          <p className="text-destructive text-center text-xs">{error}</p>
        ) : null}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creating…" : "Create account"}
        </Button>
      </form>
      <p className="text-muted-foreground text-center text-xs">
        Already have an account?{" "}
        <Link href="/login" className="text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
