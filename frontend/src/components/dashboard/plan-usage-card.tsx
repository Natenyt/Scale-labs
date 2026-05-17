"use client";

import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useWorkspaceBilling } from "@/lib/billing/use-workspace-billing";
import { getPlanById } from "@/lib/mock/billing";
import { cn } from "@/lib/utils";

export function PlanUsageCard({
  voiceMinutesLast30Days,
  className,
}: {
  voiceMinutesLast30Days?: number | null;
  className?: string;
}) {
  const billing = useWorkspaceBilling();
  const plan = getPlanById(billing.planId) ?? getPlanById("scale")!;
  const included = billing.minutesIncluded;
  const used =
    voiceMinutesLast30Days != null
      ? Math.round(voiceMinutesLast30Days)
      : billing.minutesUsed;
  const hasCap = included > 0;
  const pct = hasCap ? Math.min(100, Math.round((used / included) * 100)) : 0;
  const remaining = hasCap ? Math.max(0, included - used) : null;

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="grid gap-1.5">
            <p className="text-muted-foreground/80 text-[11px] font-medium uppercase tracking-[0.12em]">
              Plan
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-semibold tracking-tight">
                {plan.name}
              </span>
              <span className="text-muted-foreground text-xs tabular-nums">
                {plan.priceMonthly}
              </span>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href="/billing">
              Manage
              <ArrowRightIcon className="size-3.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5">
        {hasCap ? (
          <div className="grid gap-3">
            <div className="flex items-end justify-between gap-3">
              <div className="grid gap-0.5">
                <p className="text-[34px] font-semibold leading-none tabular-nums tracking-[-0.02em]">
                  {remaining!.toLocaleString()}
                </p>
                <p className="text-muted-foreground text-xs">
                  minutes left this period
                </p>
              </div>
              <div className="text-right">
                <p className="text-foreground text-sm font-medium tabular-nums">
                  {pct}%
                </p>
                <p className="text-muted-foreground text-[11px] tabular-nums">
                  {used.toLocaleString()} / {included.toLocaleString()}
                </p>
              </div>
            </div>
            <Progress value={pct} className="h-1.5" />
          </div>
        ) : (
          <p className="text-muted-foreground text-sm leading-relaxed">
            Custom volume pricing — contact your account team for usage reports.
          </p>
        )}

        <dl className="border-border/40 mt-auto grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-4 text-sm sm:grid-cols-4">
          <UsageStat label="Agents" value={billing.agentsInUse} />
          <UsageStat label="Workflows" value={billing.workflowsInUse} />
          <UsageStat label="Numbers" value={billing.numbersInUse} />
          <UsageStat label="Integrations" value={billing.integrationsConnected} />
        </dl>
      </CardContent>
    </Card>
  );
}

function UsageStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-muted-foreground/80 text-[10px] font-medium uppercase tracking-[0.1em]">
        {label}
      </dt>
      <dd className="text-base font-medium tabular-nums">{value}</dd>
    </div>
  );
}
