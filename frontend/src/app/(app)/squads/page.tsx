import { UsersIcon } from "lucide-react";

import { ComingSoonPage } from "@/components/coming-soon-page";

export default function SquadsPage() {
  return (
    <ComingSoonPage
      title="Squads"
      description="Run coordinated teams of voice agents with smooth handoffs between assistants."
      icon={UsersIcon}
      headline="Multi-agent squads are on the way"
      body="Soon you will be able to group agents, define handoff rules, and manage shared call flows from one place. Until then, build and test individual agents and workflows from the rest of the studio."
      links={[
        { label: "View agents", href: "/agents" },
        { label: "Open workflow", href: "/workflow" },
      ]}
    />
  );
}
