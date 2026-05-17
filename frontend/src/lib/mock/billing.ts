export type PlanId = "pilot" | "operations" | "scale" | "enterprise";

export type Plan = {
  id: PlanId;
  name: string;
  tagline: string;
  priceMonthly: string;
  priceMonthlyUz?: string;
  perMinute: string;
  overagePerMinute?: string;
  includedMinutes: number;
  concurrentCalls: number;
  agents: string;
  workflows: string;
  integrations: string;
  numbers: number;
  seats: number;
  logRetention: string;
  support: string;
  highlights: string[];
  /** Paid plans shown in the main pricing grid (excludes Pilot). */
  showInPricingGrid: boolean;
  cta: string;
};

export type BillingAddon = {
  id: string;
  name: string;
  description: string;
  price: string;
  cadence: "month" | "one_time";
};

export const PILOT_PLAN: Plan = {
  id: "pilot",
  name: "Pilot",
  tagline: "Try Scale Labs free for 14 days",
  priceMonthly: "Free",
  perMinute: "150 minutes total",
  includedMinutes: 150,
  concurrentCalls: 2,
  agents: "2 agents",
  workflows: "1 published workflow",
  integrations: "1 data connection",
  numbers: 1,
  seats: 2,
  logRetention: "7 days",
  support: "Documentation",
  highlights: [
    "No credit card required",
    "Browser voice testing included",
    "Upgrade when you are ready for production",
  ],
  showInPricingGrid: false,
  cta: "Start free trial",
};

export const PLANS: Plan[] = [
  PILOT_PLAN,
  {
    id: "operations",
    name: "Operations",
    tagline: "One production use case live on the phone",
    priceMonthly: "$149",
    priceMonthlyUz: "~1.9M UZS",
    perMinute: "1,500 min included",
    overagePerMinute: "$0.24",
    includedMinutes: 1500,
    concurrentCalls: 10,
    agents: "10 agents",
    workflows: "3 published workflows",
    integrations: "3 data connections",
    numbers: 3,
    seats: 5,
    logRetention: "30 days",
    support: "Email (2 business days)",
    highlights: [
      "1,500 voice minutes per month",
      "All workflow templates",
      "Outbound and inbound numbers",
    ],
    showInPricingGrid: true,
    cta: "Get Operations",
  },
  {
    id: "scale",
    name: "Scale",
    tagline: "Multiple campaigns and teams",
    priceMonthly: "$599",
    perMinute: "6,000 min included",
    overagePerMinute: "$0.20",
    includedMinutes: 6000,
    concurrentCalls: 30,
    agents: "Unlimited agents",
    workflows: "Unlimited workflows",
    integrations: "10 data connections",
    numbers: 15,
    seats: 15,
    logRetention: "90 days",
    support: "Priority email + onboarding",
    highlights: [
      "6,000 voice minutes per month",
      "Exportable analytics",
      "Higher concurrency for peak hours",
    ],
    showInPricingGrid: true,
    cta: "Get Scale",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "24/7 volume, compliance, and custom integrations",
    priceMonthly: "Custom",
    perMinute: "Volume pricing",
    includedMinutes: 0,
    concurrentCalls: 0,
    agents: "Unlimited",
    workflows: "Unlimited",
    integrations: "Custom + on-prem options",
    numbers: 0,
    seats: 0,
    logRetention: "1 year+",
    support: "SLA + named contact",
    highlights: [
      "Committed minutes and reserved concurrency",
      "Uzbek/Russian production support",
      "Custom CRM and API connectors",
    ],
    showInPricingGrid: true,
    cta: "Contact sales",
  },
];

export const PRICING_PLANS = PLANS.filter((p) => p.showInPricingGrid);

export const BILLING_ADDONS: BillingAddon[] = [
  {
    id: "minute-pack",
    name: "Minute pack",
    description: "1,000 extra voice minutes. Valid for 12 months.",
    price: "$120",
    cadence: "one_time",
  },
  {
    id: "phone-pack",
    name: "Phone line pack",
    description: "Five additional dedicated phone numbers.",
    price: "$40",
    cadence: "month",
  },
  {
    id: "voice-uz",
    name: "Uzbek & Russian voice",
    description: "Premium localized speech and prompt QA for UZ/RU production.",
    price: "$199",
    cadence: "month",
  },
  {
    id: "compliance",
    name: "Trust & compliance",
    description: "Extended retention, audit export, and DPA for regulated teams.",
    price: "$499",
    cadence: "month",
  },
];

export type Invoice = {
  id: string;
  date: string;
  description: string;
  amount: string;
  status: "paid" | "pending";
};

export const INVOICES: Invoice[] = [
  {
    id: "INV-2026-04",
    date: "Apr 1, 2026",
    description: "Scale plan — March (incl. overage)",
    amount: "$648.00",
    status: "paid",
  },
  {
    id: "INV-2026-03",
    date: "Mar 1, 2026",
    description: "Scale plan — February",
    amount: "$599.00",
    status: "paid",
  },
  {
    id: "INV-2026-02",
    date: "Feb 1, 2026",
    description: "Scale plan — January",
    amount: "$599.00",
    status: "paid",
  },
];

export const CURRENT_PLAN: PlanId = "scale";

export const CURRENT_USAGE = {
  minutesUsed: 4210,
  minutesIncluded: 6000,
  agentsInUse: 4,
  workflowsInUse: 2,
  numbersInUse: 3,
  integrationsConnected: 2,
};

export function getPlanById(id: PlanId): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

/** Rows for the plan comparison table on the billing page. */
export const PLAN_COMPARISON_ROWS: {
  label: string;
  values: Record<PlanId, string>;
}[] = [
  {
    label: "Monthly price",
    values: {
      pilot: "Free (14 days)",
      operations: "$149",
      scale: "$599",
      enterprise: "Custom",
    },
  },
  {
    label: "Voice minutes",
    values: {
      pilot: "150 total",
      operations: "1,500 included",
      scale: "6,000 included",
      enterprise: "Committed volume",
    },
  },
  {
    label: "Overage",
    values: {
      pilot: "—",
      operations: "$0.24 / min",
      scale: "$0.20 / min",
      enterprise: "Contract rate",
    },
  },
  {
    label: "Concurrent calls",
    values: {
      pilot: "2",
      operations: "10",
      scale: "30",
      enterprise: "Reserved",
    },
  },
  {
    label: "Phone numbers",
    values: {
      pilot: "1",
      operations: "3",
      scale: "15",
      enterprise: "Unlimited / pooled",
    },
  },
  {
    label: "Published workflows",
    values: {
      pilot: "1",
      operations: "3",
      scale: "Unlimited",
      enterprise: "Unlimited",
    },
  },
  {
    label: "Data connections",
    values: {
      pilot: "1",
      operations: "3",
      scale: "10",
      enterprise: "Custom",
    },
  },
  {
    label: "Seats",
    values: {
      pilot: "2",
      operations: "5",
      scale: "15",
      enterprise: "Unlimited",
    },
  },
  {
    label: "Log retention",
    values: {
      pilot: "7 days",
      operations: "30 days",
      scale: "90 days",
      enterprise: "1 year+",
    },
  },
];
