"use client";

import Link from "next/link";

import {
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function MinutesUsedIndicator() {
  const { state, isMobile } = useSidebar();

  if (state === "collapsed" && !isMobile) return null;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Link
          href="/billing"
          className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground block rounded-md p-2 text-[11px] transition"
        >
          <span className="text-sidebar-foreground/70">Usage &amp; billing</span>
          <p className="text-sidebar-foreground/60 mt-0.5 text-[10px] leading-snug">
            Workspace metering
          </p>
        </Link>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
