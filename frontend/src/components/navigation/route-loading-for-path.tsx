import {
  AgentsRouteLoading,
  CallDetailSkeleton,
  DashboardRouteLoading,
  IntegrationsRouteLoading,
  LogsRouteLoading,
  MetricsRouteLoading,
  PhoneDetailSkeleton,
  PhoneNumbersRouteLoading,
  ToolsRouteLoading,
  WorkflowRouteLoading,
} from "@/components/loading/page-skeletons";

function normalizePath(path: string): string {
  const base = path.split("?")[0]?.split("#")[0] ?? path;
  if (base.length > 1 && base.endsWith("/")) {
    return base.slice(0, -1);
  }
  return base;
}

export function RouteLoadingForPath({ path }: { path: string }) {
  const normalized = normalizePath(path);

  switch (normalized) {
    case "/dashboard":
      return <DashboardRouteLoading />;
    case "/metrics":
      return <MetricsRouteLoading />;
    case "/logs":
      return <LogsRouteLoading />;
    case "/phone-numbers":
      return <PhoneNumbersRouteLoading />;
    case "/agents":
      return <AgentsRouteLoading />;
    case "/tools":
      return <ToolsRouteLoading />;
    case "/workflow":
      return <WorkflowRouteLoading />;
    case "/integrations":
      return <IntegrationsRouteLoading />;
    default:
      break;
  }

  if (/^\/logs\/[^/]+$/.test(normalized)) {
    return <CallDetailSkeleton />;
  }

  if (/^\/phone-numbers\/[^/]+$/.test(normalized)) {
    return <PhoneDetailSkeleton />;
  }

  return null;
}

export function hasRouteLoading(path: string): boolean {
  const normalized = normalizePath(path);
  if (
    [
      "/dashboard",
      "/metrics",
      "/logs",
      "/phone-numbers",
      "/agents",
      "/tools",
      "/workflow",
      "/integrations",
    ].includes(normalized)
  ) {
    return true;
  }
  return /^\/logs\/[^/]+$/.test(normalized) || /^\/phone-numbers\/[^/]+$/.test(normalized);
}
