/**
 * Build a clean chat transcript from Vapi client messages.
 *
 * TWO speakers, TWO sources:
 *
 * - CUSTOMER: arrives as `transcript` (role:"user") events — many interim
 *   partials then a final per utterance. We consolidate consecutive same-speaker
 *   utterances into ONE turn line; partials update it in place, finals
 *   accumulate, a speaker change starts a new line.
 *
 * - ASSISTANT: comes from `conversation-update` (Vapi's own record of what the
 *   agent said — the clean LLM/first-message text). We deliberately do NOT use
 *   `transcript` (role:"assistant"): with our custom transcriber the bridge only
 *   transcribes the customer, so Vapi emits no assistant transcript, and even
 *   when it does it's a re-transcription of the TTS audio (garbled). The
 *   conversation record is the authoritative, clean assistant text and includes
 *   the opening first-message greeting. New assistant messages are appended by
 *   count so repeated conversation-update snapshots don't duplicate lines.
 *
 * `model-output` (the raw LLM token stream) is ignored — conversation-update
 * already carries the finalized assistant text.
 */

export type TranscriptChatLine = {
  id: string;
  role: "system" | "transcript";
  text: string;
  streamRole?: "assistant" | "user";
  /** True while a partial (interim) utterance is live in this turn. */
  isStreaming?: boolean;
  /** Accumulated finalized text for this turn (internal bookkeeping). */
  committed?: string;
};

export function newTranscriptLineId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

const TRANSCRIPT_TYPES = new Set([
  "transcript",
  "transcript[transcriptType='final']",
  "transcript-update",
]);

function format(role: "assistant" | "user", text: string): string {
  return `[${role}] ${text}`;
}

function replaceLast(
  lines: TranscriptChatLine[],
  next: TranscriptChatLine,
): TranscriptChatLine[] {
  return lines.map((line, i) => (i === lines.length - 1 ? next : line));
}

/** Extract the assistant messages (clean text, in order) from a conversation-update. */
function assistantMessagesFrom(o: Record<string, unknown>): string[] {
  const conv = Array.isArray(o.conversation)
    ? o.conversation
    : Array.isArray(o.messages)
      ? o.messages
      : [];
  const out: string[] = [];
  for (const m of conv) {
    if (!m || typeof m !== "object") continue;
    const mm = m as Record<string, unknown>;
    const role = mm.role;
    if (role !== "assistant" && role !== "bot") continue;
    const content =
      typeof mm.content === "string"
        ? mm.content
        : typeof mm.message === "string"
          ? mm.message
          : "";
    const text = content.trim();
    if (text) out.push(text);
  }
  return out;
}

function mergeConversationUpdate(
  lines: TranscriptChatLine[],
  o: Record<string, unknown>,
): TranscriptChatLine[] {
  const assistantMsgs = assistantMessagesFrom(o);
  if (assistantMsgs.length === 0) return lines;

  const renderedCount = lines.filter(
    (l) => l.role === "transcript" && l.streamRole === "assistant",
  ).length;

  let out = lines;
  // Append only assistant messages we haven't rendered yet (dedupe by count),
  // so repeated conversation-update snapshots don't re-add earlier turns.
  for (let i = renderedCount; i < assistantMsgs.length; i++) {
    out = [
      ...out,
      {
        id: newTranscriptLineId(),
        role: "transcript",
        streamRole: "assistant",
        isStreaming: false,
        committed: assistantMsgs[i],
        text: format("assistant", assistantMsgs[i]),
      },
    ];
  }
  return out;
}

export function mergeVapiClientMessage(
  lines: TranscriptChatLine[],
  raw: unknown,
): TranscriptChatLine[] {
  if (!raw || typeof raw !== "object") return lines;
  const o = raw as Record<string, unknown>;
  const t = typeof o.type === "string" ? o.type : "";

  // Assistant turns: from Vapi's clean conversation record.
  if (t === "conversation-update") return mergeConversationUpdate(lines, o);

  // Customer turns: from transcript events (role:"user"). Assistant transcript
  // events are ignored — the assistant comes from conversation-update above.
  if (!TRANSCRIPT_TYPES.has(t)) return lines;
  if (o.role !== "user") return lines;

  const streamRole = "user" as const;
  const body = (
    typeof o.transcript === "string"
      ? o.transcript
      : typeof o.transcriptPartial === "string"
        ? o.transcriptPartial
        : typeof o.text === "string"
          ? o.text
          : ""
  ).trim();
  if (!body) return lines;

  const isFinal =
    o.transcriptType === "final" || t === "transcript[transcriptType='final']";

  // The current turn is the last line iff it's a transcript from this speaker.
  const last = lines[lines.length - 1];
  const activeTurn =
    last && last.role === "transcript" && last.streamRole === streamRole
      ? last
      : null;

  if (!isFinal) {
    // Partial: show committed text + the live interim tail, in place.
    const committed = activeTurn?.committed ?? "";
    const text = committed ? `${committed} ${body}` : body;
    const lineForm: TranscriptChatLine = {
      id: activeTurn?.id ?? newTranscriptLineId(),
      role: "transcript",
      streamRole,
      isStreaming: true,
      committed,
      text: format(streamRole, text),
    };
    return activeTurn ? replaceLast(lines, lineForm) : [...lines, lineForm];
  }

  // Final: commit this utterance into the active turn (or open a new turn).
  const committed = activeTurn?.committed ?? "";
  const merged =
    committed && !committed.endsWith(body)
      ? `${committed} ${body}`
      : committed || body;
  const lineForm: TranscriptChatLine = {
    id: activeTurn?.id ?? newTranscriptLineId(),
    role: "transcript",
    streamRole,
    isStreaming: false,
    committed: merged,
    text: format(streamRole, merged),
  };
  return activeTurn ? replaceLast(lines, lineForm) : [...lines, lineForm];
}
