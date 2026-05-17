"use client";

import Link from "next/link";

import { useWorkspaceBilling } from "@/lib/billing/use-workspace-billing";
import { getPlanById } from "@/lib/mock/billing";
import {
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function MinutesUsedIndicator() {
  const { state, isMobile } = useSidebar();
  const billing = useWorkspaceBilling();
  const plan = getPlanById(billing.planId);

  if (state === "collapsed" && !isMobile) return null;

  const included = billing.minutesIncluded;
  const used = billing.minutesUsed;
  const pct =
    included > 0 ? Math.min(100, Math.round((used / included) * 100)) : 0;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Link
          href="/billing"
          className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground block rounded-md p-2 text-[11px] transition"
        >
          <span className="text-sidebar-foreground/70">
            {plan?.name ?? "Plan"} · {pct}% minutes
          </span>
          <p className="text-sidebar-foreground/60 mt-0.5 text-[10px] leading-snug tabular-nums">
            {used.toLocaleString()} / {included > 0 ? included.toLocaleString() : "—"} used
          </p>
        </Link>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
