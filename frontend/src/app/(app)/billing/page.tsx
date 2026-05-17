"use client";

import { PricingSection } from "@/components/billing/pricing-section";
import { PlanUsageCard } from "@/components/dashboard/plan-usage-card";
import { PageHeader } from "@/components/page-header";
import { useWorkspaceBilling } from "@/lib/billing/use-workspace-billing";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DEMO_INVOICES } from "@/lib/demo/acme-presentation-data";
import { useMetricsQuery } from "@/lib/query/use-metrics-query";

export default function BillingPage() {
  const billing = useWorkspaceBilling();
  const metricsQuery = useMetricsQuery({ days: 30, step: "day" });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 pt-4 md:pt-6">
      <PageHeader
        eyebrow="Workspace"
        title="Plans & usage"
        description="Usage and limits for your current workspace. Checkout is not connected yet — upgrade buttons are placeholders."
      />

      <PlanUsageCard voiceMinutesLast30Days={metricsQuery.data?.kpis.totalMinutes} />

      <PricingSection />

      <section className="grid gap-4">
        <div className="grid gap-1">
          <p className="text-muted-foreground/80 text-[11px] font-medium uppercase tracking-[0.12em]">
            Billing history
          </p>
          <h2 className="text-lg font-semibold tracking-tight">Recent invoices</h2>
          <p className="text-muted-foreground text-sm">
            {billing.invoicesAreSample
              ? "Sample invoices for this workspace until payment processing is connected."
              : "Invoices will appear here after billing is enabled."}
          </p>
        </div>
        <Card>
          <CardContent className="divide-border/40 divide-y px-0 py-0">
            {(billing.invoicesAreSample ? DEMO_INVOICES : []).map((inv) => (
              <div
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 text-sm"
              >
                <div className="grid gap-0.5">
                  <p className="font-medium">{inv.description}</p>
                  <p className="text-muted-foreground text-[11px] tabular-nums">
                    {inv.id} · {inv.date}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium tabular-nums">{inv.amount}</span>
                  <Badge
                    variant={inv.status === "paid" ? "secondary" : "outline"}
                    className="border-border/50 text-[10px] font-medium uppercase tracking-wide"
                  >
                    {inv.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
