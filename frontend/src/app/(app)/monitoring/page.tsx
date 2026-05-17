import { ActivityIcon } from "lucide-react";

import { ComingSoonPage } from "@/components/coming-soon-page";

export default function MonitoringPage() {
  return (
    <ComingSoonPage
      eyebrow="Observe"
      title="Monitoring"
      description="Live health, alerts, and quality signals for your voice operations."
      icon={ActivityIcon}
      headline="Operational monitoring is coming soon"
      body="Soon you will see real-time call health, error trends, and assistant performance in one view. For now, use Logs for call history and Metrics for usage and cost."
      links={[
        { label: "View logs", href: "/logs" },
        { label: "View metrics", href: "/metrics" },
      ]}
    />
  );
}
