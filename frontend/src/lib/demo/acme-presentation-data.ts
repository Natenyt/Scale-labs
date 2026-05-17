/**
 * Rich mock data for the Acme Inc presentation workspace (screenshots / demos).
 */

import { applyAgentsHydrate } from "@/lib/agents/hydrate-bridge";
import { baseAgent, type Agent } from "@/lib/agents/types";
import type {
  CallLogDetail,
  CallLogSummary,
} from "@/lib/calls/call-logs-api";
import { replaceAllIntegrations } from "@/lib/integrations/store";
import type { NotionIntegration } from "@/lib/integrations/types";
import type { PlanId } from "@/lib/mock/billing";
import { INVOICES } from "@/lib/mock/billing";
import type { MetricsDashboard } from "@/lib/metrics/metrics-api";
import type { PhoneNumberSummary } from "@/lib/phone-numbers/phone-numbers-api";
import { replaceAllWorkflows } from "@/lib/workflows/store";
import { getWorkflowTemplate } from "@/lib/workflows/templates";
import type { Workflow } from "@/lib/workflows/types";
import { importVapiWorkflow } from "@/lib/workflows/vapi-import";

import {
  DEMO_ACCOUNT_EMAIL,
  DEMO_ORG_NAME,
  isDemoWorkspaceUser,
} from "./constants";

export { isDemoWorkspaceUser };

const AGENT_NAMES = [
  "Payment Reminder — UZ",
  "Lead Qualification EN",
  "CSAT Survey",
  "Fraud Step-Up",
  "Delivery Updates",
  "Appointment Confirm",
  "Support FAQ",
  "Collections — Soft",
  "Onboarding Welcome",
  "Win-Back Outreach",
] as const;

const WORKFLOW_DEFS: {
  id: string;
  templateId: "lead-qualification" | "appointment-scheduler" | "customer-satisfaction";
  name: string;
}[] = [
  { id: "wf_acme_lead", templateId: "lead-qualification", name: "Lead Qualification" },
  { id: "wf_acme_appt", templateId: "appointment-scheduler", name: "Appointment Scheduler" },
  { id: "wf_acme_csat", templateId: "customer-satisfaction", name: "Customer Satisfaction" },
  { id: "wf_acme_fraud", templateId: "lead-qualification", name: "Fraud Verification" },
  { id: "wf_acme_collect", templateId: "appointment-scheduler", name: "Payment Collections" },
];

let demoCallLogsCache: CallLogSummary[] | null = null;
let demoCallDetailsCache: Map<string, CallLogDetail> | null = null;
let demoMetricsCache: MetricsDashboard | null = null;
let demoPhonesCache: PhoneNumberSummary[] | null = null;
let demoAgentsCache: Agent[] | null = null;

export const DEMO_BILLING_SNAPSHOT = {
  planId: "scale" as PlanId,
  minutesUsed: 5210,
  minutesIncluded: 6000,
  agentsInUse: 10,
  workflowsInUse: 5,
  numbersInUse: 12,
  integrationsConnected: 3,
  invoicesAreSample: true,
};

export const DEMO_INVOICES = INVOICES;

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(9 + (n % 8), 12 + (n % 40), 0, 0);
  return d.toISOString();
}

function buildDemoAgents(): Agent[] {
  const now = Date.now();
  return AGENT_NAMES.map((name, i) => {
    const id = `ag_${2001 + i}`;
    const minutes = 320 + i * 185 + (i % 3) * 90;
    const lang = i % 5 === 0 ? "uz" : i % 7 === 0 ? "ru" : "en";
    return baseAgent({
      id,
      name,
      language: lang,
      status: "live",
      description: `Production voice agent for ${name.toLowerCase()}.`,
      tags: i < 3 ? ["production", "priority"] : ["production"],
      minutesThisMonth: minutes,
      last7Days: [42, 58, 61, 55, 72, 48, 66].map((v) => v + i * 4),
      lastCallAt: new Date(now - i * 3_600_000 * 4).toISOString(),
      vapiAssistantId: `asst_acme_${id}`,
      phoneNumber: i < 8 ? `+1 415 555 ${String(1000 + i).slice(-4)}` : null,
      createdAt: daysAgo(40 + i),
    });
  });
}

function buildDemoWorkflows(): Workflow[] {
  const t = new Date().toISOString();
  return WORKFLOW_DEFS.map((def, i) => {
    const tpl = getWorkflowTemplate(def.templateId);
    const imported = tpl.vapi
      ? importVapiWorkflow(tpl.vapi)
      : { name: def.name, nodes: [], edges: [] };
    return {
      id: def.id,
      name: def.name,
      description: tpl.description,
      globalPrompt: imported.globalPrompt,
      nodes: imported.nodes,
      edges: imported.edges,
      vapiWorkflowId: `vapi_wf_acme_${i + 1}`,
      syncStatus: "synced" as const,
      createdAt: daysAgo(30 + i),
      updatedAt: daysAgo(i % 5),
    };
  });
}

function buildDemoIntegrations(): NotionIntegration[] {
  const t = daysAgo(20);
  return [
    {
      id: "int_acme_crm",
      kind: "notion",
      label: "Acme CRM — Customers",
      databaseId: "db_acme_customers",
      dataSourceId: "ds_acme_customers",
      databaseTitle: "Customers",
      fieldMap: [],
      token: "",
      vapiTools: [],
      syncStatus: "synced",
      createdAt: t,
    },
    {
      id: "int_acme_tickets",
      kind: "notion",
      label: "Support Tickets",
      databaseId: "db_acme_tickets",
      dataSourceId: "ds_acme_tickets",
      databaseTitle: "Tickets",
      fieldMap: [],
      token: "",
      vapiTools: [],
      syncStatus: "synced",
      createdAt: daysAgo(18),
    },
    {
      id: "int_acme_campaigns",
      kind: "notion",
      label: "Outbound Campaigns",
      databaseId: "db_acme_campaigns",
      dataSourceId: "ds_acme_campaigns",
      databaseTitle: "Campaigns",
      fieldMap: [],
      token: "",
      vapiTools: [],
      syncStatus: "synced",
      createdAt: daysAgo(12),
    },
  ];
}

function buildDemoPhoneNumbers(): PhoneNumberSummary[] {
  const areas = ["415", "628", "212", "305", "512", "702", "206", "303", "404", "617", "214", "480"];
  return areas.map((area, i) => ({
    id: `ph_acme_${i + 1}`,
    number: `+1 (${area}) 555-${String(1000 + i).slice(-4)}`,
    name: i < 4 ? "Inbound support" : i < 8 ? "Outbound campaigns" : "Regional line",
    provider: "scale_labs",
    providerLabel: "Scale Labs",
    status: "active",
    statusLabel: "Active",
    assignedType: i % 3 === 0 ? "workflow" : "agent",
    assignedTo:
      i % 3 === 0
        ? WORKFLOW_DEFS[i % WORKFLOW_DEFS.length]!.name
        : AGENT_NAMES[i % AGENT_NAMES.length]!,
    assistantId: i % 3 !== 0 ? `asst_acme_ag_${2001 + (i % 10)}` : null,
    workflowId: i % 3 === 0 ? `vapi_wf_acme_${(i % 5) + 1}` : null,
    assignAgentId: i % 3 !== 0 ? `ag_${2001 + (i % 10)}` : null,
    assignWorkflowId: i % 3 === 0 ? WORKFLOW_DEFS[i % WORKFLOW_DEFS.length]!.id : null,
    createdAt: daysAgo(25 + i),
    updatedAt: daysAgo(i % 7),
  }));
}

function buildDemoCallLogs(): CallLogSummary[] {
  const agents = AGENT_NAMES;
  const reasons = [
    "customer-ended-call",
    "assistant-ended-call",
    "silence-timed-out",
    "voicemail",
  ];
  const types = ["outboundPhoneCall", "inboundPhoneCall", "webCall"];
  const logs: CallLogSummary[] = [];

  for (let i = 0; i < 86; i++) {
    const dur = 45 + (i % 17) * 22 + (i % 5) * 8;
    const cost = Math.round((dur / 60) * 0.22 * 100) / 100;
    const agent = agents[i % agents.length]!;
    const id = `call_acme_${String(i + 1).padStart(4, "0")}`;
    logs.push({
      id,
      startedAt: daysAgo(i % 28),
      type: types[i % types.length]!,
      typeRaw: types[i % types.length]!,
      endedReason: reasons[i % reasons.length]!,
      durationSeconds: dur,
      durationLabel: `${Math.floor(dur / 60)}m ${dur % 60}s`,
      cost,
      costLabel: `$${cost.toFixed(2)}`,
      resourceName: agent,
      customerNumber:
        i % 4 === 0
          ? "Browser test"
          : `+1 555 ${String(2000 + (i % 800)).slice(-4)}`,
    });
  }

  return logs.sort((a, b) => {
    const ta = a.startedAt ? new Date(a.startedAt).getTime() : 0;
    const tb = b.startedAt ? new Date(b.startedAt).getTime() : 0;
    return tb - ta;
  });
}

function buildCallDetails(logs: CallLogSummary[]): Map<string, CallLogDetail> {
  const map = new Map<string, CallLogDetail>();
  for (const log of logs) {
    const total = log.cost ?? 0.12;
    map.set(log.id, {
      ...log,
      recordingUrl: null,
      transcript: [
        { role: "assistant", text: "Hello, this is Acme calling regarding your account.", at: log.startedAt },
        { role: "user", text: "Yes, go ahead.", at: log.startedAt },
        { role: "assistant", text: "Thank you. I have a quick update for you today.", at: log.startedAt },
      ],
      logs: [
        {
          time: log.startedAt,
          level: "info",
          category: "call",
          message: "Call started",
        },
        {
          time: log.startedAt,
          level: "info",
          category: "workflow",
          message: "Entered node: introduction",
        },
      ],
      costDetail: {
        total,
        totalLabel: log.costLabel,
        durationSeconds: log.durationSeconds,
        durationLabel: log.durationLabel,
        items: [
          { label: "Voice session", amount: total, amountLabel: log.costLabel, percent: 100 },
        ],
      },
    });
  }
  return map;
}

function sparklineDays(days: number, base: number): Array<{ date: string; value: number }> {
  const out: Array<{ date: string; value: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    const jitter = Math.sin(i * 0.7) * 40 + (i % 5) * 12;
    out.push({ date, value: Math.max(0, Math.round(base + jitter)) });
  }
  return out;
}

function buildDemoMetrics(): MetricsDashboard {
  const minutesSpark = sparklineDays(30, 140);
  const callsSpark = sparklineDays(30, 12);
  const costSpark = sparklineDays(30, 28);

  const assistantRows = AGENT_NAMES.slice(0, 6).map((name, i) => ({
    assistant: name,
    minutes: 420 + i * 180,
    calls: 28 + i * 11,
  }));

  return {
    kpis: {
      totalMinutes: 5210,
      totalMinutesLabel: "5,210",
      callCount: 842,
      callCountLabel: "842",
      totalCost: 1146.2,
      totalCostLabel: "$1,146.20",
      avgCost: 1.36,
      avgCostLabel: "$1.36",
      sparklines: {
        minutes: minutesSpark,
        calls: callsSpark,
        cost: costSpark,
      },
    },
    charts: {
      endedReason: {
        data: [
          { reason: "Customer ended", count: 412 },
          { reason: "Assistant ended", count: 198 },
          { reason: "Voicemail", count: 124 },
          { reason: "Timeout", count: 108 },
        ],
        series: [{ key: "count", label: "Calls" }],
      },
      durationByAssistant: {
        data: assistantRows.map((r) => ({
          assistant: r.assistant,
          minutes: r.minutes,
        })),
        series: [{ key: "minutes", label: "Minutes" }],
      },
      costBreakdown: {
        data: [
          { category: "Voice", amount: 980 },
          { category: "Platform", amount: 166 },
        ],
        series: [{ key: "amount", label: "USD" }],
      },
      callsByType: {
        data: callsSpark.map((c) => {
          const outbound = Math.max(1, Math.round(c.value * 0.58));
          const inbound = Math.max(1, Math.round(c.value * 0.32));
          const web = Math.max(0, c.value - outbound - inbound);
          return { date: c.date, outbound, inbound, web };
        }),
        series: [
          { key: "outbound", label: "Outbound" },
          { key: "inbound", label: "Inbound" },
          { key: "web", label: "Web" },
        ],
      },
      avgDuration: {
        data: minutesSpark.map((m) => ({
          date: m.date,
          seconds: 95 + (m.value % 40),
        })),
        series: [{ key: "seconds", label: "Avg sec" }],
      },
      costOverTime: {
        data: costSpark.map((c) => ({ date: c.date, cost: c.value })),
        series: [{ key: "cost", label: "Cost" }],
      },
      successEval: {
        data: [
          { outcome: "Success", count: 720 },
          { outcome: "Partial", count: 82 },
          { outcome: "Failed", count: 40 },
        ],
        series: [{ key: "count", label: "Calls" }],
      },
      concurrency: {
        data: Array.from({ length: 24 }, (_, h) => ({
          hour: `${h}:00`,
          calls: 2 + (h % 6) + (h > 8 && h < 20 ? 8 : 0),
        })),
        series: [{ key: "calls", label: "Concurrent" }],
      },
    },
    unsuccessfulCalls: [
      {
        id: "call_acme_fail_1",
        resourceName: AGENT_NAMES[3]!,
        startedAt: daysAgo(1),
        customerNumber: "+1 555 8821",
        statusLabel: "No answer",
      },
      {
        id: "call_acme_fail_2",
        resourceName: AGENT_NAMES[7]!,
        startedAt: daysAgo(2),
        customerNumber: "+1 555 4410",
        statusLabel: "Busy",
      },
    ],
    meta: {
      days: 30,
      step: "day",
      callsSampled: 842,
      callsSampleLimit: 1000,
    },
  };
}

export function getDemoCallLogs(): CallLogSummary[] {
  if (!demoCallLogsCache) {
    demoCallLogsCache = buildDemoCallLogs();
    demoCallDetailsCache = buildCallDetails(demoCallLogsCache);
  }
  return demoCallLogsCache;
}

export function getDemoCallLogDetail(callId: string): CallLogDetail | null {
  getDemoCallLogs();
  return demoCallDetailsCache?.get(callId) ?? null;
}

export function getDemoMetrics(): MetricsDashboard {
  if (!demoMetricsCache) demoMetricsCache = buildDemoMetrics();
  return demoMetricsCache;
}

export function getDemoPhoneNumbers(): PhoneNumberSummary[] {
  if (!demoPhonesCache) demoPhonesCache = buildDemoPhoneNumbers();
  return demoPhonesCache;
}

export function getDemoAgents(): Agent[] {
  if (!demoAgentsCache) demoAgentsCache = buildDemoAgents();
  return demoAgentsCache;
}

export function hydrateDemoWorkspace(): void {
  const workflows = buildDemoWorkflows();
  const integrations = buildDemoIntegrations();

  replaceAllWorkflows(workflows);
  replaceAllIntegrations(integrations);
  applyAgentsHydrate({
    agents: getDemoAgents(),
    remote: true,
    apiAgentsLoadFailed: false,
  });

  demoCallLogsCache = null;
  demoCallDetailsCache = null;
  demoMetricsCache = null;
  demoPhonesCache = null;
}

export function clearDemoPresentationCaches(): void {
  demoCallLogsCache = null;
  demoCallDetailsCache = null;
  demoMetricsCache = null;
  demoPhonesCache = null;
  demoAgentsCache = null;
}

export function getDemoAccountLabel(): string {
  return `${DEMO_ACCOUNT_EMAIL} · ${DEMO_ORG_NAME}`;
}
