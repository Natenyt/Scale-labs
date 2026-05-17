"use client";

import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  CURRENT_PLAN,
  CURRENT_USAGE,
  PLANS,
} from "@/lib/mock/billing";

export function PlanUsageCard({
  voiceMinutesLast30Days,
  agentsInUse,
  workflowsInUse,
  phoneNumbersInUse,
  integrationsConnected,
  className,
}: {
  voiceMinutesLast30Days: number | null;
  agentsInUse: number;
  workflowsInUse: number;
  phoneNumbersInUse: number;
  integrationsConnected: number;
  className?: string;
}) {
  const plan = PLANS.find((p) => p.id === CURRENT_PLAN) ?? PLANS[1];
  const included = plan.includedMinutes;
  const used =
    voiceMinutesLast30Days != null
      ? Math.round(voiceMinutesLast30Days)
      : CURRENT_USAGE.minutesUsed;
  const hasCap = included > 0;
  const pct = hasCap ? Math.min(100, Math.round((used / included) * 100)) : 0;
  const remaining = hasCap ? Math.max(0, included - used) : null;

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-primary/15 bg-gradient-to-br from-primary/[0.07] via-card to-card",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-primary/10 blur-3xl"
      />
      <CardHeader className="relative pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
              Your plan
            </p>
            <CardTitle className="text-xl font-semibold tracking-tight">
              {plan.name}
            </CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              {plan.priceMonthly}
              <span className="text-muted-foreground/80"> · {plan.perMinute}</span>
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href="/billing">
              Manage
              <ArrowRightIcon className="size-3.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="relative grid gap-5">
        {hasCap ? (
          <div className="grid gap-2">
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="text-3xl font-semibold tabular-nums tracking-tight">
                  {remaining!.toLocaleString()}
                </p>
                <p className="text-muted-foreground text-sm">
                  minutes left this period
                </p>
              </div>
              <p className="text-muted-foreground text-right text-xs tabular-nums">
                {used.toLocaleString()} / {included.toLocaleString()} used
              </p>
            </div>
            <Progress value={pct} className="h-2" />
            <p className="text-muted-foreground text-[11px] leading-snug">
              {voiceMinutesLast30Days != null
                ? "Usage reflects voice minutes in the last 30 days from your live call data."
                : "Sample usage until billing metering is connected to your workspace."}
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm leading-relaxed">
            Custom volume pricing — contact your account team for usage reports.
          </p>
        )}

        <dl className="border-border/60 grid grid-cols-2 gap-3 border-t pt-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground text-xs">Agents</dt>
            <dd className="font-medium tabular-nums">{agentsInUse}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Workflows</dt>
            <dd className="font-medium tabular-nums">{workflowsInUse}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Phone numbers</dt>
            <dd className="font-medium tabular-nums">{phoneNumbersInUse}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Integrations</dt>
            <dd className="font-medium tabular-nums">{integrationsConnected}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
