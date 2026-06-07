export type Language = "en" | "ru" | "uz";

export type AgentStatus = "draft" | "live";

export type WriteBackPolicy = "off" | "summary" | "full";

export type VoicemailAction = "hangup" | "leave_message";

export type RecordingFormat = "wav" | "mp3";

/** How a transfer hands the caller off. */
export type TransferMode = "blind" | "warm";

export type TransferDestination = {
  id: string;
  /** Friendly label the agent reasons about, e.g. "Billing", "Support lead". */
  name: string;
  /** Destination phone number in E.164, e.g. +14155551234. */
  number: string;
  /** Optional line the agent says before transferring. */
  message: string;
  mode: TransferMode;
};

export type Agent = {
  id: string;
  name: string;
  description: string;
  language: Language;
  status: AgentStatus;
  tags: string[];
  voiceId: string;
  speed: number;
  /** Fixed server-side to a low-latency model; not user-selectable. */
  model: string;
  systemPrompt: string;
  firstMessage: string;
  knowledgeFiles: { id: string; name: string; sizeKb: number }[];
  integrationId: string | null;
  lookupField: string | null;
  contextFields: string[];
  writeBack: WriteBackPolicy;
  /** Call transfer ("transferCall" tool). */
  transferEnabled: boolean;
  transferDestinations: TransferDestination[];
  voicemailDetection: boolean;
  voicemailAction: VoicemailAction;
  /** Message left when voicemailAction is "leave_message". */
  voicemailMessage: string;
  recording: boolean;
  recordingFormat: RecordingFormat;
  transcript: boolean;
  dtmf: boolean;
  maxCallMinutes: number;
  idleTimeoutSeconds: number;
  /** Server-managed Vapi assistant id (never shown in UI). */
  vapiAssistantId: string | null;
  phoneNumber: string | null;
  lastCallAt: string | null;
  minutesThisMonth: number;
  last7Days: number[];
  createdAt: string;
};

export type Voice = {
  /** Vapi native voice id (also the spoken name). */
  id: string;
  name: string;
  gender: "male" | "female";
  description: string;
};

export type AgentTemplate = {
  id: string;
  name: string;
  description: string;
  defaults: Partial<Agent>;
};

// Vapi native voices (provider "vapi") — lowest TTS latency, no external hop.
// `id` is the Vapi voiceId. Elliot is the default.
export const VOICES: Voice[] = [
  { id: "Elliot", name: "Elliot", gender: "male", description: "Warm and natural — the default." },
  { id: "Clara", name: "Clara", gender: "female", description: "Friendly and clear." },
  { id: "Savannah", name: "Savannah", gender: "female", description: "Calm and professional." },
  { id: "Emma", name: "Emma", gender: "female", description: "Approachable and upbeat." },
  { id: "Rohan", name: "Rohan", gender: "male", description: "Confident and articulate." },
  { id: "Kai", name: "Kai", gender: "male", description: "Bright and energetic." },
];

/** Default voice (Vapi native). */
export const DEFAULT_VOICE_ID = "Elliot";

/** The single low-latency model every agent runs on (not user-selectable). */
export const FIXED_MODEL = "gpt-4o-mini-cluster";

export const TEMPLATES: AgentTemplate[] = [
  {
    id: "blank",
    name: "Blank",
    description: "Start from scratch with sensible defaults.",
    defaults: {
      systemPrompt:
        "You are a helpful, concise voice assistant. Speak naturally and keep responses brief.",
      firstMessage: "Hello, how can I help you today?",
    },
  },
  {
    id: "support",
    name: "Customer Support",
    description: "Handles inbound questions and routes complex issues to a human.",
    defaults: {
      systemPrompt:
        "You are a friendly customer support agent. Greet the customer, identify their issue, look up their record from the CRM context, and resolve simple questions. Transfer to a human for anything you cannot answer with confidence.",
      firstMessage:
        "Hi, you have reached customer support. May I have your name to pull up your account?",
      transferEnabled: true,
    },
  },
  {
    id: "outbound",
    name: "Outbound Reminder",
    description: "Calls customers to remind them of payments, appointments or deliveries.",
    defaults: {
      systemPrompt:
        "You are an outbound reminder agent. Politely remind the customer of the upcoming event in their record. Confirm if they will attend or pay. Keep the call under 90 seconds.",
      firstMessage:
        "Hello, this is a courtesy call from Scale Labs. Is now a good time to talk briefly?",
      maxCallMinutes: 3,
    },
  },
  {
    id: "recruitment",
    name: "Recruitment Screen",
    description: "Pre-screens candidates with a short structured set of questions.",
    defaults: {
      systemPrompt:
        "You are a recruitment screening agent. Ask the candidate 5 short questions about their experience, availability and salary expectations. Be respectful and concise. Save the answers as a structured note.",
      firstMessage:
        "Hi, this is a quick screening call for the role you applied to. Do you have 3 minutes to chat?",
    },
  },
];

/** Default field values + overrides; used by templates and API hydration. */
export const baseAgent = (
  overrides: Partial<Agent> & Pick<Agent, "id" | "name" | "language">,
): Agent => ({
  description: "",
  status: "draft",
  tags: [],
  voiceId: DEFAULT_VOICE_ID,
  speed: 1.0,
  model: FIXED_MODEL,
  systemPrompt:
    "You are a helpful, concise voice assistant. Speak naturally and keep responses brief.",
  firstMessage: "Hello, how can I help you today?",
  knowledgeFiles: [],
  integrationId: null,
  lookupField: null,
  contextFields: [],
  writeBack: "summary",
  transferEnabled: false,
  transferDestinations: [],
  voicemailDetection: true,
  voicemailAction: "hangup",
  voicemailMessage: "",
  recording: true,
  recordingFormat: "wav",
  transcript: true,
  dtmf: false,
  maxCallMinutes: 10,
  idleTimeoutSeconds: 20,
  vapiAssistantId: null,
  phoneNumber: null,
  lastCallAt: null,
  minutesThisMonth: 0,
  last7Days: [0, 0, 0, 0, 0, 0, 0],
  createdAt: new Date().toISOString(),
  ...overrides,
});

export function makeAgentFromTemplate(
  template: AgentTemplate,
  name: string,
  language: Language = "en",
): Agent {
  return baseAgent({
    id: "pending",
    name: name.trim() || "Untitled agent",
    language,
    ...template.defaults,
  });
}

// Vapi native voices are language-agnostic — the same voice speaks whatever the
// model outputs — so the catalog is shown for every language.
export function getVoicesForLanguage(_language: Language) {
  return VOICES;
}

export function getVoiceById(id: string) {
  return VOICES.find((v) => v.id === id) ?? null;
}

export const LANGUAGE_LABELS: Record<Language, { label: string; flag: string }> = {
  en: { label: "English", flag: "EN" },
  ru: { label: "Russian", flag: "RU" },
  uz: { label: "Uzbek", flag: "UZ" },
};
