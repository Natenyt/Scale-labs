/**
 * Build a clean, per-turn chat transcript from Vapi Web SDK client messages.
 *
 * Verified against the Vapi client-message schema (docs.vapi.ai + OpenAPI):
 *
 * - "conversation-update" is the AUTHORITATIVE settled history and the ONLY
 *   place the assistant's text is available with a customer-only custom
 *   transcriber (our transcriber only transcribes the customer). Its shape:
 *     { type:"conversation-update",
 *       messages?: [{ role:"user"|"bot"|"system"|..., message: string, ... }],
 *       messagesOpenAIFormatted: [{ role:"user"|"assistant"|"system"|"tool", content: string }] }
 *   NOTE: there is NO top-level "conversation" array; the assistant is role
 *   "bot" in `messages` (text field "message") and role "assistant" in
 *   `messagesOpenAIFormatted` (text field "content").
 *
 * - "transcript" streams the LIVE in-progress utterance:
 *     { type:"transcript", role:"user"|"assistant", transcriptType:"partial"|"final", transcript:string }
 *   Partials SUPERSEDE each other within a turn (replace, never concatenate — that
 *   was the "one bubble grows forever" bug); a "final" settles the turn.
 *
 * Strategy: rebuild the committed bubble list from conversation-update on every
 * update (correct order, both speakers, per-turn), and overlay at most one live
 * bubble from the latest transcript partial for real-time feel.
 */

export type TranscriptChatLine = {
  id: string;
  role: "system" | "transcript";
  text: string;
  streamRole?: "assistant" | "user";
  /** True while a partial (interim) utterance is live in this turn. */
  isStreaming?: boolean;
  /** Finalized text for this turn (internal bookkeeping). */
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

type Bubble = { role: "assistant" | "user"; text: string };

function bubblesFrom(
  arr: unknown,
  textField: "message" | "content",
): Bubble[] {
  if (!Array.isArray(arr)) return [];
  const out: Bubble[] = [];
  for (const m of arr) {
    if (!m || typeof m !== "object") continue;
    const mm = m as Record<string, unknown>;
    const r = mm.role;
    const role: "assistant" | "user" | null =
      r === "user" ? "user" : r === "assistant" || r === "bot" ? "assistant" : null;
    if (!role) continue; // skip system / tool / tool_calls
    const c = mm[textField];
    const text = typeof c === "string" ? c.trim() : "";
    if (text) out.push({ role, text });
  }
  return out;
}

/** Ordered user/assistant turns from a conversation-update. Prefer the raw
 *  `messages` (includes the spoken first-message greeting as role "bot"); fall
 *  back to `messagesOpenAIFormatted` (role "assistant"). */
function conversationBubbles(o: Record<string, unknown>): Bubble[] {
  const raw = bubblesFrom(o.messages, "message");
  if (raw.length > 0) return raw;
  return bubblesFrom(o.messagesOpenAIFormatted, "content");
}

export function mergeVapiClientMessage(
  lines: TranscriptChatLine[],
  raw: unknown,
): TranscriptChatLine[] {
  if (!raw || typeof raw !== "object") return lines;
  const o = raw as Record<string, unknown>;
  const t = typeof o.type === "string" ? o.type : "";

  if (typeof console !== "undefined" && (t === "conversation-update" || TRANSCRIPT_TYPES.has(t))) {
    // Lightweight diagnostics (kept intentionally): confirms what Vapi emits.
    console.debug("[vapi-msg]", t, o.role ?? "", o.transcriptType ?? "");
  }

  // Authoritative, settled history (includes the assistant).
  if (t === "conversation-update") {
    const bubbles = conversationBubbles(o);
    if (bubbles.length === 0) return lines;
    const system = lines.filter((l) => l.role === "system");
    const committed: TranscriptChatLine[] = bubbles.map((b, i) => ({
      id: `cu-${i}-${b.role}`,
      role: "transcript",
      streamRole: b.role,
      isStreaming: false,
      committed: b.text,
      text: format(b.role, b.text),
    }));
    // Keep a live in-progress partial only if it isn't already committed.
    const live = lines.find((l) => l.isStreaming);
    const covered =
      live &&
      bubbles.some(
        (b) => b.role === live.streamRole && b.text === (live.committed || "").trim(),
      );
    return [...system, ...committed, ...(live && !covered ? [live] : [])];
  }

  // Live overlay: one trailing in-progress bubble from transcript partials.
  if (!TRANSCRIPT_TYPES.has(t)) return lines;

  const role: "assistant" | "user" = o.role === "assistant" ? "assistant" : "user";
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

  const last = lines[lines.length - 1];
  const activeLive =
    last && last.isStreaming && last.streamRole === role ? last : null;

  // Partials SUPERSEDE (replace) the live bubble; a final settles it. Either
  // way the conversation-update will re-commit the turn authoritatively.
  const lineForm: TranscriptChatLine = {
    id: activeLive?.id ?? newTranscriptLineId(),
    role: "transcript",
    streamRole: role,
    isStreaming: !isFinal,
    committed: isFinal ? body : "",
    text: format(role, body),
  };
  return activeLive ? replaceLast(lines, lineForm) : [...lines, lineForm];
}
