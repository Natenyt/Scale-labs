import { apiFetch } from "@/lib/api/client";

export type OutboundCallSource =
  | { kind: "agent"; agentId: string }
  | { kind: "workflow"; workflowId: string };

export type PlaceOutboundCallInput = {
  customerNumber: string;
  source: OutboundCallSource;
  phoneNumberId?: string;
};

export type OutboundCallResult = {
  id: string;
  direction: string;
  vapi_call_id: string;
  status: string;
  customer_number: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export async function placeOutboundCall(
  input: PlaceOutboundCallInput,
): Promise<OutboundCallResult> {
  const body: Record<string, string> = {
    customer_number: input.customerNumber,
  };
  if (input.source.kind === "agent") {
    body.agent_id = input.source.agentId;
  } else {
    body.workflow_id = input.source.workflowId;
  }
  if (input.phoneNumberId) {
    body.phone_number_id = input.phoneNumberId;
  }
  return apiFetch<OutboundCallResult>("/api/v1/calls/outbound/", {
    method: "POST",
    json: body,
  });
}
