import { Card, CardContent } from "@/components/ui/card";

export default function BillingPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 pt-2">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Plans &amp; Usage</h1>
        <p className="text-muted-foreground text-sm">
          Usage metering and invoices for your organization will appear here.
        </p>
      </div>

      <Card>
        <CardContent className="text-muted-foreground py-10 text-sm leading-relaxed">
          Billing is not connected yet. When usage tracking ships, you will see minutes,
          active agents, and invoices for your workspace in this view.
        </CardContent>
      </Card>
    </div>
  );
}
