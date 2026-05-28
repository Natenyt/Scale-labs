export type Language = "en" | "ru" | "uz";

export type AgentStatus = "draft" | "live";

export type WriteBackPolicy = "off" | "summary" | "full";

/**
 * The locked standalone-agent tool surface. Custom CRM writebacks
 * (save_note, update_field) live in workflows, not on the agent itself.
 */
export type ToolId = "query" | "transfer_call" | "send_sms" | "voicemail";

export type VoicemailAction = "hangup" | "leave_message";

export type RecordingFormat = "wav" | "mp3";

export type Agent = {
  id: string;
  name: string;
  description: string;
  language: Language;
  status: AgentStatus;
  tags: string[];
  voiceId: string;
  speed: number;
  model: string;
  systemPrompt: string;
  firstMessage: string;
  knowledgeFiles: { id: string; name: string; sizeKb: number }[];
  integrationId: string | null;
  lookupField: string | null;
  contextFields: string[];
  writeBack: WriteBackPolicy;
  enabledTools: Record<ToolId, boolean>;
  voicemailDetection: boolean;
  voicemailAction: VoicemailAction;
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
  id: string;
  name: string;
  gender: "male" | "female";
  age: "young" | "adult" | "mature";
  language: Language;
  provider: "elevenlabs";
  accent?: string;
};

export type Tool = {
  id: ToolId;
  name: string;
  description: string;
};

export type AgentTemplate = {
  id: string;
  name: string;
  description: string;
  defaults: Partial<Agent>;
};

export const VOICES: Voice[] = [
  { id: "v_emma", name: "Emma", gender: "female", age: "adult", language: "en", provider: "elevenlabs", accent: "American" },
  { id: "v_oliver", name: "Oliver", gender: "male", age: "adult", language: "en", provider: "elevenlabs", accent: "British" },
  { id: "v_aria", name: "Aria", gender: "female", age: "young", language: "en", provider: "elevenlabs", accent: "American" },
  { id: "v_marcus", name: "Marcus", gender: "male", age: "mature", language: "en", provider: "elevenlabs", accent: "American" },
  { id: "v_sophie", name: "Sophie", gender: "female", age: "young", language: "en", provider: "elevenlabs", accent: "British" },
  { id: "v_james", name: "James", gender: "male", age: "adult", language: "en", provider: "elevenlabs", accent: "Australian" },
  { id: "v_alena", name: "Alena", gender: "female", age: "adult", language: "ru", provider: "elevenlabs" },
  { id: "v_filipp", name: "Filipp", gender: "male", age: "adult", language: "ru", provider: "elevenlabs" },
  { id: "v_jane", name: "Jane", gender: "female", age: "young", language: "ru", provider: "elevenlabs" },
  { id: "v_omazh", name: "Omazh", gender: "female", age: "mature", language: "ru", provider: "elevenlabs" },
  { id: "v_zahar", name: "Zahar", gender: "male", age: "mature", language: "ru", provider: "elevenlabs" },
  { id: "v_ermil", name: "Ermil", gender: "male", age: "young", language: "ru", provider: "elevenlabs" },
  { id: "v_nigora", name: "Nigora", gender: "female", age: "adult", language: "uz", provider: "elevenlabs" },
  { id: "v_bekhzod", name: "Bekhzod", gender: "male", age: "adult", language: "uz", provider: "elevenlabs" },
  { id: "v_madina", name: "Madina", gender: "female", age: "young", language: "uz", provider: "elevenlabs" },
  { id: "v_azamat", name: "Azamat", gender: "male", age: "mature", language: "uz", provider: "elevenlabs" },
  { id: "v_dilnoza", name: "Dilnoza", gender: "female", age: "mature", language: "uz", provider: "elevenlabs" },
  { id: "v_jasur", name: "Jasur", gender: "male", age: "young", language: "uz", provider: "elevenlabs" },
];

export const TOOLS: Tool[] = [
  {
    id: "query",
    name: "Query (web search)",
    description:
      "Lets the agent look up outside facts mid-call. Backed by a dedicated research agent that can search the internet.",
  },
  {
    id: "transfer_call",
    name: "Transfer call",
    description:
      "Hand off the live call to a human or another destination when the situation calls for it.",
  },
  {
    id: "send_sms",
    name: "Send SMS",
    description:
      "Send a short text message during or right after the call (confirmation, link, reference number).",
  },
  {
    id: "voicemail",
    name: "Voicemail",
    description:
      "Handle voicemail detection and decide whether to hang up or leave a templated message.",
  },
];

export const MODELS: { id: string; name: string; description: string }[] = [
  { id: "gpt-4o-mini-cluster", name: "GPT-4o Mini Cluster", description: "Default. Fast, cost-efficient, multilingual." },
  { id: "gpt-4o-cluster", name: "GPT-4o Cluster", description: "Higher reasoning, slower." },
  { id: "claude-haiku", name: "Claude Haiku", description: "Fast and concise responses." },
  { id: "claude-sonnet", name: "Claude Sonnet", description: "Deeper reasoning, longer thinking." },
];

const DEFAULT_TOOLS: Record<ToolId, boolean> = {
  query: true,
  transfer_call: true,
  send_sms: false,
  voicemail: true,
};

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
      enabledTools: { ...DEFAULT_TOOLS, transfer_call: true },
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
      enabledTools: { ...DEFAULT_TOOLS, send_sms: true },
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
      enabledTools: { ...DEFAULT_TOOLS },
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
  voiceId:
    overrides.language === "ru"
      ? "v_alena"
      : overrides.language === "uz"
        ? "v_nigora"
        : "v_emma",
  speed: 1.0,
  model: "gpt-4o-mini-cluster",
  systemPrompt:
    "You are a helpful, concise voice assistant. Speak naturally and keep responses brief.",
  firstMessage: "Hello, how can I help you today?",
  knowledgeFiles: [],
  integrationId: null,
  lookupField: null,
  contextFields: [],
  writeBack: "summary",
  enabledTools: { ...DEFAULT_TOOLS },
  voicemailDetection: true,
  voicemailAction: "hangup",
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

export function getVoicesForLanguage(language: Language) {
  return VOICES.filter((v) => v.language === language);
}

export function getVoiceById(id: string) {
  return VOICES.find((v) => v.id === id) ?? null;
}

export const LANGUAGE_LABELS: Record<Language, { label: string; flag: string }> = {
  en: { label: "English", flag: "EN" },
  ru: { label: "Russian", flag: "RU" },
  uz: { label: "Uzbek", flag: "UZ" },
};
