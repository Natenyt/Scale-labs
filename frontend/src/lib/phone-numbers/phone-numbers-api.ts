import { apiFetch } from "@/lib/api/client";

export type PhoneNumberSummary = {
  id: string;
  number: string;
  name: string;
  provider: string;
  providerLabel: string;
  status: string;
  statusLabel: string;
  assignedType: "agent" | "workflow" | "none";
  assignedTo: string;
  assistantId: string | null;
  workflowId: string | null;
  assignAgentId: string | null;
  assignWorkflowId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type CreatePhoneNumberInput = {
  provider: "vapi" | "twilio" | "vonage" | "telnyx" | "byo";
  name?: string;
  areaCode?: string;
  number?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  credentialId?: string;
  sipUri?: string;
  assignAgentId?: string;
  assignWorkflowId?: string;
};

export type UpdatePhoneNumberInput = {
  name?: string;
  assignAgentId?: string;
  assignWorkflowId?: string;
  clearAssignment?: boolean;
};

export async function fetchPhoneNumbers(): Promise<PhoneNumberSummary[]> {
  const data = await apiFetch<{ results: PhoneNumberSummary[] }>(
    "/api/v1/phone-numbers/",
  );
  return data.results ?? [];
}

export async function fetchPhoneNumber(id: string): Promise<PhoneNumberSummary> {
  const encoded = encodeURIComponent(id);
  return apiFetch<PhoneNumberSummary>(`/api/v1/phone-numbers/${encoded}/`);
}

export async function createPhoneNumber(
  input: CreatePhoneNumberInput,
): Promise<PhoneNumberSummary> {
  return apiFetch<PhoneNumberSummary>("/api/v1/phone-numbers/", {
    method: "POST",
    json: {
      provider: input.provider,
      name: input.name,
      area_code: input.areaCode,
      number: input.number,
      twilio_account_sid: input.twilioAccountSid,
      twilio_auth_token: input.twilioAuthToken,
      credential_id: input.credentialId,
      sip_uri: input.sipUri,
      assign_agent_id: input.assignAgentId,
      assign_workflow_id: input.assignWorkflowId,
    },
  });
}

export async function updatePhoneNumber(
  id: string,
  input: UpdatePhoneNumberInput,
): Promise<PhoneNumberSummary> {
  const encoded = encodeURIComponent(id);
  return apiFetch<PhoneNumberSummary>(`/api/v1/phone-numbers/${encoded}/`, {
    method: "PATCH",
    json: {
      name: input.name,
      assign_agent_id: input.assignAgentId,
      assign_workflow_id: input.assignWorkflowId,
      clear_assignment: input.clearAssignment,
    },
  });
}

export async function deletePhoneNumber(id: string): Promise<void> {
  const encoded = encodeURIComponent(id);
  await apiFetch<void>(`/api/v1/phone-numbers/${encoded}/`, {
    method: "DELETE",
  });
}
