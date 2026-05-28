"use client";

import * as React from "react";
import {
  Activity,
  Bot,
  LayoutDashboard,
  LineChart,
  Phone,
  PhoneOutgoing,
  PlugZap,
  ScrollText,
  Users,
  Waves,
  Workflow,
  Wrench,
} from "lucide-react";

import { MinutesUsedIndicator } from "@/components/minutes-used-indicator";
import { NavMain, type NavGroup } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import { useAuth } from "@/contexts/auth-context";
import { useWorkspaceBilling } from "@/lib/billing/use-workspace-billing";
import { useActiveOrgName } from "@/lib/dashboard/use-active-org-name";
import { getPlanById } from "@/lib/mock/billing";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

const navGroups: NavGroup[] = [
  {
    label: "Build",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Agents", url: "/agents", icon: Bot },
      { title: "Squads", url: "/squads", icon: Users },
      { title: "Tools", url: "/tools", icon: Wrench },
      { title: "Workflow", url: "/workflow", icon: Workflow },
      { title: "Call", url: "/calls", icon: PhoneOutgoing },
    ],
  },
  {
    label: "Connect",
    items: [
      { title: "Integrations", url: "/integrations", icon: PlugZap },
      { title: "Phone Numbers", url: "/phone-numbers", icon: Phone },
    ],
  },
  {
    label: "Observe",
    items: [
      { title: "Logs", url: "/logs", icon: ScrollText },
      { title: "Metrics", url: "/metrics", icon: LineChart },
      { title: "Monitoring", url: "/monitoring", icon: Activity },
    ],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  const orgName = useActiveOrgName();
  const billing = useWorkspaceBilling();
  const plan = getPlanById(billing.planId);

  const displayUser = {
    name: user?.email.split("@")[0] ?? "User",
    email: user?.email ?? "signed-in",
    avatar: "",
  };

  const teams = [
    {
      name: orgName,
      logo: <Waves className="size-4" />,
      plan: plan?.name ?? "Workspace",
    },
  ];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain groups={navGroups} />
      </SidebarContent>
      <SidebarFooter>
        <MinutesUsedIndicator />
        <NavUser user={displayUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
