"use client";

import { toast } from "sonner";
import { CheckIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { useWorkspaceBilling } from "@/lib/billing/use-workspace-billing";
import {
  BILLING_ADDONS,
  PILOT_PLAN,
  PLAN_COMPARISON_ROWS,
  PRICING_PLANS,
  type Plan,
  type PlanId,
} from "@/lib/mock/billing";
import { cn } from "@/lib/utils";

function PlanCard({
  plan,
  isCurrent,
}: {
  plan: Plan;
  isCurrent: boolean;
}) {
  const isEnterprise = plan.id === "enterprise";
  const isFeatured = plan.id === "scale";

  return (
    <Card
      className={cn(
        "relative flex flex-col",
        isFeatured && !isCurrent && "ring-1 ring-foreground/20",
        isCurrent && "ring-1 ring-emerald-500/40",
      )}
    >
      {(isFeatured || isCurrent) ? (
        <div className="border-border/40 flex items-center justify-between gap-2 border-b px-4 py-2">
          {isCurrent ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.1em] text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              Current plan
            </span>
          ) : (
            <span className="text-muted-foreground/0 text-[10px]">·</span>
          )}
          {isFeatured ? (
            <span className="bg-foreground text-background rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider">
              Popular
            </span>
          ) : null}
        </div>
      ) : null}
      <CardHeader className="pb-3">
        <p className="text-muted-foreground/80 text-[11px] font-medium uppercase tracking-[0.12em]">
          {plan.name}
        </p>
        <p className="text-muted-foreground text-xs leading-relaxed">
          {plan.tagline}
        </p>
        <div className="pt-3">
          <p className="text-3xl font-semibold tracking-[-0.02em] tabular-nums">
            {plan.priceMonthly}
          </p>
          {plan.priceMonthlyUz ? (
            <p className="text-muted-foreground mt-0.5 text-[11px] tabular-nums">
              {plan.priceMonthlyUz}
            </p>
          ) : null}
          <p className="text-muted-foreground mt-1.5 text-xs">
            {plan.perMinute}
            {plan.overagePerMinute
              ? ` · then ${plan.overagePerMinute} / min`
              : null}
          </p>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-4">
        <ul className="grid gap-2">
          {plan.highlights.map((h) => (
            <li key={h} className="flex gap-2 text-xs leading-relaxed">
              <CheckIcon className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
              <span className="text-foreground/90">{h}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="border-border/40 bg-transparent">
        <Button
          type="button"
          className="w-full"
          variant={isFeatured ? "default" : "outline"}
          disabled={isCurrent}
          onClick={() => {
            toast.message("Billing checkout is not connected yet.", {
              description: isEnterprise
                ? "Contact sales for Enterprise pricing."
                : `Selected plan: ${plan.name}.`,
            });
          }}
        >
          {isCurrent ? "Current plan" : plan.cta}
        </Button>
      </CardFooter>
    </Card>
  );
}

export function PricingSection() {
  const billing = useWorkspaceBilling();
  const currentPlanId = billing.planId;

  return (
    <div className="grid gap-10">
      <Card className="border-dashed bg-muted/10">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid gap-1">
              <p className="text-muted-foreground/80 text-[11px] font-medium uppercase tracking-[0.12em]">
                Trial
              </p>
              <h3 className="text-base font-semibold tracking-tight">
                {PILOT_PLAN.name}
              </h3>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {PILOT_PLAN.tagline}
              </p>
            </div>
            <Badge variant="secondary" className="font-normal">
              14-day trial
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end justify-between gap-4 pb-4">
          <p className="text-muted-foreground max-w-xl text-sm leading-relaxed">
            {PILOT_PLAN.includedMinutes} voice minutes, {PILOT_PLAN.numbers} phone
            number, and {PILOT_PLAN.workflows.toLowerCase()} — enough to prove one
            use case before you choose a paid plan.
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={currentPlanId === "pilot"}
            onClick={() =>
              toast.message("Trial signup is not connected yet.", {
                description: "Pilot tier will activate without a credit card.",
              })
            }
          >
            {currentPlanId === "pilot" ? "Current trial" : PILOT_PLAN.cta}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <div className="flex items-end justify-between gap-3">
          <div className="grid gap-1">
            <p className="text-muted-foreground/80 text-[11px] font-medium uppercase tracking-[0.12em]">
              Paid plans
            </p>
            <h3 className="text-lg font-semibold tracking-tight">
              All-in voice minute pricing
            </h3>
          </div>
          <p className="text-muted-foreground hidden text-xs md:block">
            Speech, AI, and phone connection included.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {PRICING_PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={plan.id === currentPlanId}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        <div className="grid gap-1">
          <p className="text-muted-foreground/80 text-[11px] font-medium uppercase tracking-[0.12em]">
            Compare
          </p>
          <h3 className="text-lg font-semibold tracking-tight">Plan comparison</h3>
        </div>
        <div className="border-border/50 overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-border/40 border-b">
                <th className="text-muted-foreground/80 px-4 py-3 text-[10px] font-medium uppercase tracking-[0.1em]">
                  Feature
                </th>
                {(["pilot", "operations", "scale", "enterprise"] as PlanId[]).map(
                  (id) => (
                    <th
                      key={id}
                      className="text-muted-foreground/80 px-4 py-3 text-[10px] font-medium uppercase tracking-[0.1em]"
                    >
                      {id === "enterprise" ? "Enterprise" : id}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {PLAN_COMPARISON_ROWS.map((row) => (
                <tr
                  key={row.label}
                  className="border-border/40 border-b last:border-0"
                >
                  <td className="text-muted-foreground px-4 py-2.5">
                    {row.label}
                  </td>
                  {(["pilot", "operations", "scale", "enterprise"] as PlanId[]).map(
                    (id) => (
                      <td
                        key={id}
                        className="px-4 py-2.5 tabular-nums text-foreground/90"
                      >
                        {row.values[id]}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-3">
        <div className="grid gap-1">
          <p className="text-muted-foreground/80 text-[11px] font-medium uppercase tracking-[0.12em]">
            Add-ons
          </p>
          <h3 className="text-lg font-semibold tracking-tight">Optional modules</h3>
          <p className="text-muted-foreground text-sm">
            Available for Operations and Scale. Often included in Enterprise quotes.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {BILLING_ADDONS.map((addon) => (
            <Card key={addon.id}>
              <CardHeader className="pb-2">
                <p className="text-sm font-medium">{addon.name}</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  {addon.description}
                </p>
              </CardHeader>
              <CardFooter className="border-border/40 bg-transparent">
                <p className="text-sm font-medium tabular-nums">
                  {addon.price}
                  <span className="text-muted-foreground font-normal">
                    {addon.cadence === "month" ? " / month" : " one-time"}
                  </span>
                </p>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
