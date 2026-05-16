"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useIntegrations } from "@/components/integrations/integrations-store";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useWorkflows } from "@/components/workflows/workflows-store";

const SECTIONS: Record<string, { group: string; title: string; href: string }> = {
  "/dashboard": { group: "Build", title: "Dashboard", href: "/dashboard" },
  "/agents": { group: "Build", title: "Agents", href: "/agents" },
  "/squads": { group: "Build", title: "Squads", href: "/squads" },
  "/tools": { group: "Build", title: "Tools", href: "/tools" },
  "/workflow": { group: "Build", title: "Workflow", href: "/workflow" },
  "/integrations": { group: "Connect", title: "Integrations", href: "/integrations" },
  "/phone-numbers": { group: "Connect", title: "Phone Numbers", href: "/phone-numbers" },
  "/logs": { group: "Observe", title: "Logs", href: "/logs" },
  "/metrics": { group: "Observe", title: "Metrics", href: "/metrics" },
  "/monitoring": { group: "Observe", title: "Monitoring", href: "/monitoring" },
  "/billing": { group: "Account", title: "Plans & Usage", href: "/billing" },
};

export function PageBreadcrumb() {
  const pathname = usePathname() ?? "/dashboard";
  const { byId: byIntegrationId } = useIntegrations();
  const { byId: byWorkflowId } = useWorkflows();

  const agentDetailMatch = pathname.match(/^\/agents\/([^/]+)$/);
  const agentId = agentDetailMatch?.[1];

  const notionNewMatch = pathname === "/integrations/notion/new";
  const notionEditMatch = pathname.match(/^\/integrations\/notion\/([^/]+)$/);
  const notionId =
    notionEditMatch && notionEditMatch[1] !== "new" ? notionEditMatch[1] : null;
  const integration = notionId ? byIntegrationId(notionId) : undefined;

  const workflowDetailMatch = pathname.match(/^\/workflow\/([^/]+)$/);
  const workflowId = workflowDetailMatch?.[1];
  const workflow = workflowId ? byWorkflowId(workflowId) : undefined;

  const exact = SECTIONS[pathname];
  const fallback =
    exact ??
    Object.entries(SECTIONS).find(([url]) => pathname.startsWith(`${url}/`))?.[1] ??
    SECTIONS["/dashboard"];

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden md:block">
          <span className="text-muted-foreground">{fallback.group}</span>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="hidden md:block" />
        {agentId ? (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/agents">Agents</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Detail</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : workflowId ? (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/workflow">Workflows</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{workflow?.name ?? "Workflow"}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : notionNewMatch || notionId ? (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/integrations">Integrations</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>
                {notionNewMatch
                  ? "Add Notion"
                  : (integration?.label ?? "Notion")}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : (
          <BreadcrumbItem>
            <BreadcrumbPage>{fallback.title}</BreadcrumbPage>
          </BreadcrumbItem>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
