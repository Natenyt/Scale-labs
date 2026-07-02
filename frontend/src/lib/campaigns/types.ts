export type CampaignCustomer = { number: string; name?: string };

export type CampaignRow = {
  id: string;
  name: string;
  target_kind: "agent" | "squad";
  target_ext_id: string;
  phone_number_id: string;
  customers: CampaignCustomer[];
  recipient_count: number;
  schedule_earliest_at: string | null;
  status: string;
  vapi_campaign_id: string;
  created_at: string;
  updated_at: string;
};

export type CampaignLive = {
  status: string;
  counters: {
    scheduled?: number;
    queued?: number;
    inProgress?: number;
    voicemail?: number;
    ended?: number;
  };
};

export const CAMPAIGN_TERMINAL = new Set(["ended", "cancelled", "archived"]);

const E164 = /^\+[1-9]\d{7,14}$/;

function dedupe(customers: CampaignCustomer[]): CampaignCustomer[] {
  const seen = new Set<string>();
  const out: CampaignCustomer[] = [];
  for (const c of customers) {
    if (seen.has(c.number)) continue;
    seen.add(c.number);
    out.push(c);
  }
  return out;
}

/** Paste box: one recipient per line — "+1..., Optional Name". */
export function parseCustomers(raw: string): {
  customers: CampaignCustomer[];
  invalid: string[];
} {
  const customers: CampaignCustomer[] = [];
  const invalid: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    const [numPart, ...rest] = t.split(",");
    const number = numPart.trim();
    if (!E164.test(number)) {
      invalid.push(t);
      continue;
    }
    const name = rest.join(",").trim();
    customers.push(name ? { number, name } : { number });
  }
  return { customers: dedupe(customers), invalid };
}

const NUMBER_ALIASES = ["number", "phone", "phone_number", "phonenumber", "mobile"];

/** CSV upload: header-tolerant number/phone column + optional name. */
export function parseCustomersCsv(text: string): {
  customers: CampaignCustomer[];
  invalid: string[];
} {
  const rows = text
    .split(/\r?\n/)
    .map((r) => r.trim())
    .filter(Boolean);
  if (!rows.length) return { customers: [], invalid: [] };

  const split = (r: string) =>
    r.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));

  let numberIdx = 0;
  let nameIdx = -1;
  let start = 0;
  const header = split(rows[0]).map((h) => h.toLowerCase());
  if (header.some((h) => NUMBER_ALIASES.includes(h) || h === "name")) {
    start = 1;
    const ni = header.findIndex((h) => NUMBER_ALIASES.includes(h));
    numberIdx = ni >= 0 ? ni : 0;
    nameIdx = header.findIndex((h) => h === "name");
  }

  const customers: CampaignCustomer[] = [];
  const invalid: string[] = [];
  for (let i = start; i < rows.length; i++) {
    const cols = split(rows[i]);
    const number = (cols[numberIdx] ?? "").trim();
    if (!E164.test(number)) {
      invalid.push(rows[i]);
      continue;
    }
    const name = nameIdx >= 0 ? (cols[nameIdx] ?? "").trim() : "";
    customers.push(name ? { number, name } : { number });
  }
  return { customers: dedupe(customers), invalid };
}
