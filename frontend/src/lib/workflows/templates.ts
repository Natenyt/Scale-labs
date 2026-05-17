import type { VapiWorkflowPayload } from "@/lib/vapi/server";

import appointmentScheduler from "./templates/appointment-scheduler.json";
import customerSatisfactionSurvey from "./templates/customer-satisfaction-survey.json";
import leadQualificationAgent from "./templates/lead-qualification-agent.json";

export type WorkflowTemplateId =
  | "blank"
  | "lead-qualification"
  | "appointment-scheduler"
  | "customer-satisfaction";

export type WorkflowTemplate = {
  id: WorkflowTemplateId;
  name: string;
  description: string;
  defaultWorkflowName: string;
  /** Vapi-native export; omitted for blank. */
  vapi?: VapiWorkflowPayload;
};

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "blank",
    name: "Blank workflow",
    description:
      "Start from a single Start node. Design your flow on the canvas, then Save to push to Vapi.",
    defaultWorkflowName: "Untitled workflow",
  },
  {
    id: "lead-qualification",
    name: "Lead qualification",
    description:
      "B2B discovery call: needs assessment, solution fit, qualification, and handoff or nurture paths.",
    defaultWorkflowName: "Lead Qualification Agent",
    vapi: leadQualificationAgent as VapiWorkflowPayload,
  },
  {
    id: "appointment-scheduler",
    name: "Appointment scheduler",
    description:
      "Book meetings: collect availability, confirm details, and handle reschedule or cancel flows.",
    defaultWorkflowName: "Appointment Scheduler",
    vapi: appointmentScheduler as VapiWorkflowPayload,
  },
  {
    id: "customer-satisfaction",
    name: "Customer satisfaction",
    description:
      "Post-call CSAT survey: rating, feedback, escalation to a human, and polite hangup paths.",
    defaultWorkflowName: "Customer Satisfaction Survey",
    vapi: customerSatisfactionSurvey as VapiWorkflowPayload,
  },
];

export function getWorkflowTemplate(
  id: WorkflowTemplateId,
): WorkflowTemplate {
  return WORKFLOW_TEMPLATES.find((t) => t.id === id) ?? WORKFLOW_TEMPLATES[0]!;
}
