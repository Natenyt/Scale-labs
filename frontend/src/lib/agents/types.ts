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
  id: string;
  name: string;
  gender: "male" | "female";
  age: "young" | "adult" | "mature";
  language: Language;
  /** Public preview mp3 — plays directly in an <audio> element, no key/CORS. */
  previewUrl: string;
  accent?: string;
};

export type AgentTemplate = {
  id: string;
  name: string;
  description: string;
  defaults: Partial<Agent>;
};

export const VOICES: Voice[] = [
  { id: "v_emma", name: "Emma", gender: "female", age: "adult", language: "en", previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/EXAVITQu4vr4xnSDxMaL/01a3e33c-6e99-4ee7-8543-ff2216a32186.mp3", accent: "American" },
  { id: "v_oliver", name: "Oliver", gender: "male", age: "adult", language: "en", previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/CwhRBWXzGAHq8TQ4Fs17/58ee3ff5-f6f2-4628-93b8-e38eb31806b0.mp3", accent: "British" },
  { id: "v_aria", name: "Aria", gender: "female", age: "young", language: "en", previewUrl: "https://api.us.elevenlabs.io/v1/voices/FGY2WhTYpPnrIDTdsKH5/previews/audio?payload=eyJ2b2ljZV9zb3VyY2UiOiJwcmVtYWRlIiwiZmlsZW5hbWUiOiI2NzM0MTc1OS1hZDA4LTQxYTUtYmU2ZS1kZTEyZmU0NDg2MTgubXAzIiwidGltZXN0YW1wIjoxNzgwODQ4MDAwMDAwMDAwfQ%3D%3D", accent: "American" },
  { id: "v_marcus", name: "Marcus", gender: "male", age: "mature", language: "en", previewUrl: "https://api.us.elevenlabs.io/v1/voices/IKne3meq5aSn9XLyUdCD/previews/audio?payload=eyJ2b2ljZV9zb3VyY2UiOiJwcmVtYWRlIiwiZmlsZW5hbWUiOiIxMDJkZTZmMi0yMmVkLTQzZTAtYTFmMS0xMTFmYTc1YzU0ODEubXAzIiwidGltZXN0YW1wIjoxNzgwODQ4MDAwMDAwMDAwfQ%3D%3D", accent: "American" },
  { id: "v_sophie", name: "Sophie", gender: "female", age: "young", language: "en", previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/Xb7hH8MSUJpSbSDYk0k2/d10f7534-11f6-41fe-a012-2de1e482d336.mp3", accent: "British" },
  { id: "v_james", name: "James", gender: "male", age: "adult", language: "en", previewUrl: "https://api.us.elevenlabs.io/v1/voices/JBFqnCBsd6RMkjVDRZzb/previews/audio?payload=eyJ2b2ljZV9zb3VyY2UiOiJwcmVtYWRlIiwiZmlsZW5hbWUiOiJlNjIwNmQxYS0wNzIxLTQ3ODctYWFmYi0wNmE2ZTcwNWNhYzUubXAzIiwidGltZXN0YW1wIjoxNzgwODQ4MDAwMDAwMDAwfQ%3D%3D", accent: "Australian" },
  { id: "v_alena", name: "Alena", gender: "female", age: "adult", language: "ru", previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/XrExE9yKIg1WjnnlVkGX/b930e18d-6b4d-466e-bab2-0ae97c6d8535.mp3" },
  { id: "v_filipp", name: "Filipp", gender: "male", age: "adult", language: "ru", previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/N2lVS1w4EtoT3dr4eOWO/ac833bd8-ffda-4938-9ebc-b0f99ca25481.mp3" },
  { id: "v_jane", name: "Jane", gender: "female", age: "young", language: "ru", previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/cgSgspJ2msm6clMCkdW9/56a97bf8-b69b-448f-846c-c3a11683d45a.mp3" },
  { id: "v_omazh", name: "Omazh", gender: "female", age: "mature", language: "ru", previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/hpp4J3VqNfWAUOO0d1Us/dab0f5ba-3aa4-48a8-9fad-f138fea1126d.mp3" },
  { id: "v_zahar", name: "Zahar", gender: "male", age: "mature", language: "ru", previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/SOYHLrjzK2X1ezoPC6cr/86d178f6-f4b6-4e0e-85be-3de19f490794.mp3" },
  { id: "v_ermil", name: "Ermil", gender: "male", age: "young", language: "ru", previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/TX3LPaxmHKxFdv7VOQHJ/63148076-6363-42db-aea8-31424308b92c.mp3" },
  { id: "v_nigora", name: "Nigora", gender: "female", age: "adult", language: "uz", previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/pFZP5JQG7iQjIQuC4Bku/89b68b35-b3dd-4348-a84a-a3c13a3c2b30.mp3" },
  { id: "v_bekhzod", name: "Bekhzod", gender: "male", age: "adult", language: "uz", previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/bIHbv24MWmeRgasZH58o/8caf8f3d-ad29-4980-af41-53f20c72d7a4.mp3" },
  { id: "v_madina", name: "Madina", gender: "female", age: "young", language: "uz", previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/EXAVITQu4vr4xnSDxMaL/01a3e33c-6e99-4ee7-8543-ff2216a32186.mp3" },
  { id: "v_azamat", name: "Azamat", gender: "male", age: "mature", language: "uz", previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/cjVigY5qzO86Huf0OWal/d098fda0-6456-4030-b3d8-63aa048c9070.mp3" },
  { id: "v_dilnoza", name: "Dilnoza", gender: "female", age: "mature", language: "uz", previewUrl: "https://api.us.elevenlabs.io/v1/voices/FGY2WhTYpPnrIDTdsKH5/previews/audio?payload=eyJ2b2ljZV9zb3VyY2UiOiJwcmVtYWRlIiwiZmlsZW5hbWUiOiI2NzM0MTc1OS1hZDA4LTQxYTUtYmU2ZS1kZTEyZmU0NDg2MTgubXAzIiwidGltZXN0YW1wIjoxNzgwODQ4MDAwMDAwMDAwfQ%3D%3D" },
  { id: "v_jasur", name: "Jasur", gender: "male", age: "young", language: "uz", previewUrl: "https://storage.googleapis.com/eleven-public-prod/premade/voices/iP95p4xoKVk53GoZ742B/3f4bde72-cc48-40dd-829f-57fbf906f4d7.mp3" },
];

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
  voiceId:
    overrides.language === "ru"
      ? "v_alena"
      : overrides.language === "uz"
        ? "v_nigora"
        : "v_emma",
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
