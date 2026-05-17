"use client";

import * as React from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { type LucideIcon } from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  useNavActivePath,
  useNavigationPending,
} from "@/components/navigation/navigation-pending";
import { hasBackendApi } from "@/lib/api/env";
import {
  prefetchLogsPage,
  prefetchMetricsPage,
  prefetchObservePages,
  prefetchPhoneNumbersPage,
} from "@/lib/query/prefetch-app-data";

export type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

const PREFETCHABLE = new Set([
  "/dashboard",
  "/metrics",
  "/logs",
  "/phone-numbers",
]);

function prefetchForUrl(url: string, queryClient: ReturnType<typeof useQueryClient>) {
  if (!hasBackendApi()) return;
  switch (url) {
    case "/dashboard":
      prefetchObservePages(queryClient);
      break;
    case "/metrics":
      prefetchMetricsPage(queryClient);
      break;
    case "/logs":
      prefetchLogsPage(queryClient);
      break;
    case "/phone-numbers":
      prefetchPhoneNumbersPage(queryClient);
      break;
    default:
      break;
  }
}

export function NavMain({ groups }: { groups: NavGroup[] }) {
  const activePath = useNavActivePath();
  const queryClient = useQueryClient();
  const { startNavigation } = useNavigationPending();
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const isActive = (url: string) => {
    if (!activePath) return false;
    return activePath === url || activePath.startsWith(`${url}/`);
  };

  const schedulePrefetch = React.useCallback(
    (url: string) => {
      if (!PREFETCHABLE.has(url)) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        prefetchForUrl(url, queryClient);
      }, 100);
    },
    [queryClient],
  );

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <>
      {groups.map((group) => (
        <SidebarGroup key={group.label}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarMenu>
            {group.items.map((item) => {
              const Icon = item.icon;
              const dataPrefetchable = PREFETCHABLE.has(item.url);
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={isActive(item.url)}
                  >
                    <Link
                      href={item.url}
                      onClick={() => startNavigation(item.url)}
                      onMouseEnter={
                        dataPrefetchable ? () => schedulePrefetch(item.url) : undefined
                      }
                      onFocus={
                        dataPrefetchable ? () => schedulePrefetch(item.url) : undefined
                      }
                    >
                      <Icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  );
}
