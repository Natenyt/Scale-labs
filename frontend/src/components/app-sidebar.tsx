"use client";

import * as React from "react";
import {
  Activity,
  Bot,
  LayoutDashboard,
  LineChart,
  Phone,
  PhoneCall,
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
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

const data = {
  user: {
    name: "Scale Labs",
    email: "team@scalelabs.uz",
    avatar: "",
  },
  teams: [
    {
      name: "Scale Labs",
      logo: <Waves className="size-4" />,
      plan: "Workspace",
    },
  ],
  navGroups: [
    {
      label: "Build",
      items: [
        { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
        { title: "Agents", url: "/agents", icon: Bot },
        { title: "Squads", url: "/squads", icon: Users },
        { title: "Tools", url: "/tools", icon: Wrench },
        { title: "Workflow", url: "/workflow", icon: Workflow },
      ],
    },
    {
      label: "Connect",
      items: [
        { title: "Integrations", url: "/integrations", icon: PlugZap },
        { title: "Phone Numbers", url: "/phone-numbers", icon: Phone },
        { title: "Calls", url: "/calls", icon: PhoneCall },
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
  ] satisfies NavGroup[],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain groups={data.navGroups} />
      </SidebarContent>
      <SidebarFooter>
        <MinutesUsedIndicator />
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
