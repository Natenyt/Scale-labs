import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function MetricsKpiSkeletonRow() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} size="sm">
          <CardHeader className="pb-2">
            <Skeleton className="h-3 w-24" />
          </CardHeader>
          <CardContent className="grid gap-3">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

function ChartBlockSkeleton({ className }: { className?: string }) {
  return (
    <Card size="sm" className={cn("flex min-h-[220px] flex-col", className)}>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-36" />
      </CardHeader>
      <CardContent className="flex flex-1 items-end gap-2 pb-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-sm"
            style={{ height: `${35 + (i % 5) * 10}%` }}
          />
        ))}
      </CardContent>
    </Card>
  );
}

export function MetricsChartsSkeleton() {
  return (
    <div className="grid gap-8">
      <section className="grid gap-4">
        <Skeleton className="h-5 w-28" />
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartBlockSkeleton />
          <ChartBlockSkeleton />
          <ChartBlockSkeleton />
        </div>
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        <ChartBlockSkeleton />
        <ChartBlockSkeleton />
        <ChartBlockSkeleton />
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        <ChartBlockSkeleton />
        <Card size="sm" className="flex min-h-[220px] flex-col">
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="grid flex-1 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
        <ChartBlockSkeleton />
      </section>
    </div>
  );
}

export function MetricsPageSkeleton() {
  return (
    <div className="grid gap-8">
      <MetricsKpiSkeletonRow />
      <MetricsChartsSkeleton />
    </div>
  );
}

export function DashboardChartSkeleton({ className }: { className?: string }) {
  return (
    <Card size="sm" className={cn("flex min-h-[280px] flex-col", className)}>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-40" />
      </CardHeader>
      <CardContent className="flex flex-1 items-end gap-2 pb-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-sm"
            style={{ height: `${40 + (i % 5) * 12}%` }}
          />
        ))}
      </CardContent>
    </Card>
  );
}

export function RecentCallsTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-28" />
      </CardHeader>
      <CardContent className="grid gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

export function LogsTableSkeleton() {
  return (
    <div className="px-2 py-2">
      <div className="border-border/60 mb-2 grid grid-cols-6 gap-2 border-b pb-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-full max-w-[80px]" />
        ))}
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="grid grid-cols-6 gap-2 py-3">
          {Array.from({ length: 6 }).map((_, j) => (
            <Skeleton key={j} className="h-4 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function PhoneNumbersGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} size="sm" className="flex flex-col">
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-5 w-1/2 font-mono" />
            </div>
            <Skeleton className="size-8 shrink-0 rounded-md" />
          </CardHeader>
          <CardContent className="mt-auto grid gap-3 pt-0">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-9 w-full rounded-md" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function CallDetailSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6 pt-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-1 text-right">
          <Skeleton className="ml-auto h-5 w-16" />
          <Skeleton className="ml-auto h-4 w-12" />
        </div>
      </div>
      <Card size="sm">
        <CardHeader>
          <Skeleton className="h-4 w-20" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full rounded-md" />
        </CardContent>
      </Card>
      <div className="flex gap-4 border-b pb-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-20" />
      </div>
      <Card size="sm" className="min-h-[320px]">
        <CardContent className="grid gap-3 pt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              key={i}
              className={cn("h-16 rounded-lg", i % 2 === 0 ? "ml-0 w-[75%]" : "ml-auto w-[70%]")}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function PhoneDetailSkeleton() {
  return (
    <div className="grid max-w-lg gap-6">
      <Skeleton className="h-8 w-32" />
      <div className="grid gap-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-7 w-48 font-mono" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
      <Card size="sm">
        <CardHeader>
          <Skeleton className="h-4 w-16" />
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
          <div className="grid gap-1.5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
          <div className="grid gap-1.5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-9 w-28 rounded-md" />
            <Skeleton className="h-9 w-20 rounded-md" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FilterFieldSkeleton({ widthClass }: { widthClass: string }) {
  return (
    <div className="grid gap-1.5">
      <Skeleton className="h-3 w-16" />
      <Skeleton className={cn("h-9 rounded-md", widthClass)} />
    </div>
  );
}

export function MetricsFiltersSkeleton() {
  return (
    <div className="border-border/60 bg-card/30 flex flex-wrap items-end gap-4 rounded-xl border p-4">
      <FilterFieldSkeleton widthClass="w-[140px]" />
      <FilterFieldSkeleton widthClass="w-[120px]" />
      <FilterFieldSkeleton widthClass="w-[200px]" />
    </div>
  );
}

export function LogsFiltersSkeleton() {
  return (
    <div className="border-border/60 bg-card/30 flex flex-wrap items-end gap-4 rounded-xl border p-4">
      <FilterFieldSkeleton widthClass="w-[140px]" />
      <FilterFieldSkeleton widthClass="w-[200px]" />
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="grid gap-1">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-9 w-24 shrink-0 rounded-md" />
    </div>
  );
}

export function AgentsToolbarSkeleton() {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Agents</h1>
        <p className="text-muted-foreground text-sm">
          Voice agents that talk to your customers, anchored to your CRM.
        </p>
      </div>
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <Skeleton className="h-9 w-full rounded-md md:w-56" />
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
    </div>
  );
}

export function MetricsRouteLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 pt-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Metrics</h1>
          <p className="text-muted-foreground text-sm">
            Voice usage and cost for agents in your workspace.
          </p>
        </div>
        <Skeleton className="h-9 w-24 shrink-0 rounded-md" />
      </div>
      <MetricsFiltersSkeleton />
      <MetricsPageSkeleton />
    </div>
  );
}

export function LogsRouteLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 pt-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Logs</h1>
          <p className="text-muted-foreground text-sm">
            Voice calls for agents and workflows in your workspace.
          </p>
        </div>
        <Skeleton className="h-9 w-24 shrink-0 rounded-md" />
      </div>
      <LogsFiltersSkeleton />
      <div className="border-border/60 bg-card/30 overflow-hidden rounded-xl border">
        <LogsTableSkeleton />
      </div>
    </div>
  );
}

export function PhoneNumbersRouteLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 pt-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Phone numbers</h1>
          <p className="text-muted-foreground text-sm">
            Numbers that receive and place calls for your agents and workflows.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
      </div>
      <PhoneNumbersGridSkeleton />
    </div>
  );
}

export function DashboardRouteLoading() {
  return (
    <div className="flex flex-1 flex-col gap-8 pt-2">
      <PageHeaderSkeleton />
      <section className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="min-h-[180px] rounded-xl lg:col-span-2" />
        <Skeleton className="min-h-[180px] rounded-xl" />
      </section>
      <MetricsKpiSkeletonRow />
      <section className="grid gap-4 lg:grid-cols-3">
        <DashboardChartSkeleton className="lg:col-span-2" />
        <Card size="sm">
          <CardHeader>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="grid gap-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </section>
      <RecentCallsTableSkeleton />
    </div>
  );
}

export function AgentsRouteLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <AgentsToolbarSkeleton />
      <AgentsGridSkeleton />
    </div>
  );
}

export function AgentsGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} size="sm">
          <CardHeader className="flex flex-row items-start gap-3 space-y-0">
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="grid flex-1 gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
            </div>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-8 w-full rounded-md" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ListRowSkeleton() {
  return (
    <div className="border-border/60 flex items-center gap-3 rounded-lg border px-3 py-2.5">
      <Skeleton className="size-11 shrink-0 rounded-xl" />
      <div className="grid flex-1 gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-64 max-w-full" />
      </div>
    </div>
  );
}

export function ToolsRouteLoading() {
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 pt-2">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Tools</h1>
        <p className="text-muted-foreground text-sm">
          Every function tool registered with Vapi for this workspace. System
          tools are available to standalone agents; integration tools are
          provisioned automatically when you save a Notion connection.
        </p>
      </div>
      <Card>
        <CardHeader className="grid gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-full max-w-md" />
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="grid gap-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-full max-w-lg" />
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center gap-2">
            <Skeleton className="size-7 rounded-md" />
            <div className="grid flex-1 gap-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function WorkflowRouteLoading() {
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 pt-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Workflows</h1>
          <p className="text-muted-foreground text-sm">
            Visual orchestration for multi-step calls. Each workflow you save
            here is mirrored to your Vapi workspace.
          </p>
        </div>
        <Skeleton className="h-9 w-32 shrink-0 rounded-md" />
      </div>
      <Card>
        <CardHeader className="flex flex-row items-start gap-3">
          <Skeleton className="size-11 shrink-0 rounded-xl" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-full max-w-md" />
          </div>
        </CardHeader>
        <CardContent className="grid gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <ListRowSkeleton key={i} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function IntegrationsRouteLoading() {
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 pt-2">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground text-sm">
          Connect your CRM so agents can read context at the start of a call.
        </p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-start gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
          <Skeleton className="size-11 shrink-0 rounded-xl" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-full max-w-lg" />
          </div>
          <Skeleton className="h-9 w-36 shrink-0 rounded-md" />
        </CardHeader>
        <CardContent className="grid gap-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <ListRowSkeleton key={i} />
          ))}
        </CardContent>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} size="sm">
            <CardHeader className="flex flex-row items-start gap-3">
              <Skeleton className="size-11 shrink-0 rounded-xl" />
              <div className="grid flex-1 gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-full" />
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}

