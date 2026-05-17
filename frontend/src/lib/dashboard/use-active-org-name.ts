"use client";

import { useAuth } from "@/contexts/auth-context";
import { getActiveOrgId } from "@/lib/api/tokens";

export function useActiveOrgName(): string {
  const { user } = useAuth();
  const orgId = getActiveOrgId();
  if (!user?.organizations.length) return "Your workspace";
  if (orgId) {
    const match = user.organizations.find((o) => String(o.id) === orgId);
    if (match) return match.name;
  }
  return user.organizations[0].name;
}

export function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
