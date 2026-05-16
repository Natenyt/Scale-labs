export type Plan = {
  id: "starter" | "business" | "enterprise";
  name: string;
  priceMonthly: string;
  perMinute: string;
  includedMinutes: number;
  agents: string;
  workflows: string;
  integrations: string;
  numbers: number;
  highlights: string[];
};

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    priceMonthly: "$49",
    perMinute: "$0.18 / min",
    includedMinutes: 500,
    agents: "5 agents",
    workflows: "1 workflow",
    integrations: "2 integrations",
    numbers: 2,
    highlights: [
      "500 voice minutes / month included",
      "All pre-built tools",
      "Email support",
    ],
  },
  {
    id: "business",
    name: "Business",
    priceMonthly: "$299",
    perMinute: "$0.14 / min",
    includedMinutes: 3000,
    agents: "Unlimited agents",
    workflows: "Unlimited workflows",
    integrations: "Unlimited integrations",
    numbers: 10,
    highlights: [
      "3,000 voice minutes / month included",
      "Squads enabled",
      "Priority support",
      "Up to 10 phone numbers",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceMonthly: "Custom",
    perMinute: "Volume pricing",
    includedMinutes: 0,
    agents: "Unlimited agents",
    workflows: "Unlimited workflows",
    integrations: "Custom + on-prem",
    numbers: 0,
    highlights: [
      "Dedicated voice cloning",
      "On-prem CRM connectors",
      "SLA + 24/7 support",
      "HIPAA-grade compliance add-on",
    ],
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
  { id: "INV-2026-04", date: "Apr 1, 2026", description: "Business plan — March", amount: "$432.40", status: "paid" },
  { id: "INV-2026-03", date: "Mar 1, 2026", description: "Business plan — February", amount: "$378.20", status: "paid" },
  { id: "INV-2026-02", date: "Feb 1, 2026", description: "Business plan — January", amount: "$331.80", status: "paid" },
];

export const CURRENT_PLAN: Plan["id"] = "business";

export const CURRENT_USAGE = {
  minutesUsed: 1843,
  minutesIncluded: 3000,
  agentsInUse: 4,
  workflowsInUse: 1,
  numbersInUse: 3,
  integrationsConnected: 2,
};
