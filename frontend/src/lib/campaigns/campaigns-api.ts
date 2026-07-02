import { apiFetch } from "@/lib/api/client";
import type {
  CampaignCustomer,
  CampaignLive,
  CampaignRow,
} from "@/lib/campaigns/types";

export async function fetchCampaigns(): Promise<CampaignRow[]> {
  const data = await apiFetch<CampaignRow[] | { results: CampaignRow[] }>(
    "/api/v1/campaigns/",
  );
  return Array.isArray(data) ? data : (data.results ?? []);
}

export async function fetchCampaign(id: string): Promise<CampaignRow> {
  return apiFetch<CampaignRow>(`/api/v1/campaigns/${encodeURIComponent(id)}/`);
}

export async function createCampaign(input: {
  name: string;
  phoneNumberId: string;
  targetKind: "agent" | "squad";
  targetId: string;
  customers: CampaignCustomer[];
  scheduleEarliestAt?: string | null;
}): Promise<CampaignRow> {
  return apiFetch<CampaignRow>("/api/v1/campaigns/", {
    method: "POST",
    json: {
      name: input.name,
      phone_number_id: input.phoneNumberId,
      target_kind: input.targetKind,
      target_id: input.targetId,
      customers: input.customers,
      schedule_earliest_at: input.scheduleEarliestAt ?? null,
    },
  });
}

export async function stopCampaign(id: string): Promise<CampaignRow> {
  return apiFetch<CampaignRow>(
    `/api/v1/campaigns/${encodeURIComponent(id)}/stop/`,
    { method: "POST" },
  );
}

export async function deleteCampaign(id: string): Promise<void> {
  await apiFetch(`/api/v1/campaigns/${encodeURIComponent(id)}/`, {
    method: "DELETE",
  });
}

export async function fetchCampaignLive(id: string): Promise<CampaignLive> {
  return apiFetch<CampaignLive>(
    `/api/v1/campaigns/${encodeURIComponent(id)}/live/`,
  );
}
