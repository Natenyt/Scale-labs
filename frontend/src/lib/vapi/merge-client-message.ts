/**
 * Build a clean chat transcript from Vapi client messages.
 *
 * Vapi emits, per spoken utterance, many `transcript` partials (interim ASR)
 * followed by one `final`. A single *turn* (one speaker talking continuously)
 * usually spans several utterances/finals. We consolidate all consecutive
 * same-speaker utterances into ONE turn line — live partials update that line
 * in place, finals accumulate into it, and a speaker change starts a new line.
 *
 * `model-output` (the assistant's raw LLM token stream) is intentionally
 * ignored: for voice calls the assistant's words already arrive as
 * `transcript` (role:"assistant") events, so consuming model-output too would
 * both duplicate the assistant's reply and re-fragment it token-by-token.
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

export function mergeVapiClientMessage(
  lines: TranscriptChatLine[],
  raw: unknown,
): TranscriptChatLine[] {
  if (!raw || typeof raw !== "object") return lines;
  const o = raw as Record<string, unknown>;
  const t = typeof o.type === "string" ? o.type : "";

  // Only transcript events feed the chat. (model-output is dropped — see header.)
  if (!TRANSCRIPT_TYPES.has(t)) return lines;

  const streamRole: "assistant" | "user" = o.role === "user" ? "user" : "assistant";
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
  // A system line or the other speaker between us closes the turn.
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
