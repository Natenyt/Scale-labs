/**
 * Build a clean, per-turn chat transcript from Vapi Web SDK client messages.
 *
 * Event reality with the Yandex bridge stack (custom transcriber + custom
 * voice, finals-only, modelOutputInMessagesEnabled):
 *
 * - "voice-input" is the PRIMARY source of assistant text:
 *     { type:"voice-input", input: string }
 *   It carries the exact text Vapi sends to TTS — including the firstMessage
 *   greeting, which never appears anywhere else before the first model turn.
 *   Vapi's chunkPlan splits one utterance into several voice-input events
 *   (~sentence-sized); consecutive ones are appended into one bubble.
 *
 * - "conversation-update" is the settled history when it arrives:
 *     { type:"conversation-update",
 *       messages?: [{ role:"user"|"bot"|"system"|..., message: string, ... }],
 *       messagesOpenAIFormatted: [{ role:"user"|"assistant"|"system"|"tool", content: string }] }
 *   Committed bubbles are rebuilt from it; voice-input bubbles it already
 *   covers are dropped, uncovered ones (e.g. the greeting, or the utterance
 *   currently being spoken) are preserved in position.
 *
 * - "transcript" carries ONLY the customer with our transcriber, and since the
 *   bridge is finals-only there are no customer partials on uz/ru — the user's
 *   words appear as one bubble shortly after they stop speaking. (English
 *   agents on Deepgram still stream partials; the live-overlay path handles
 *   them: partials REPLACE the live bubble, a final settles it.)
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
  /** Where this bubble came from: conversation-update or voice-input. */
  source?: "cu" | "vi";
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

/** Whitespace-insensitive containment: does settled text `hay` cover `needle`?
 *  voice-input bubbles are chunk-joined TTS text; the conversation-update copy
 *  of the same turn may differ in whitespace only. */
function normalizeWs(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function covers(hay: string, needle: string): boolean {
  const h = normalizeWs(hay);
  const n = normalizeWs(needle);
  return n.length > 0 && h.includes(n);
}

export function mergeVapiClientMessage(
  lines: TranscriptChatLine[],
  raw: unknown,
): TranscriptChatLine[] {
  if (!raw || typeof raw !== "object") return lines;
  const o = raw as Record<string, unknown>;
  const t = typeof o.type === "string" ? o.type : "";

  if (
    typeof console !== "undefined" &&
    (t === "conversation-update" || t === "voice-input" || TRANSCRIPT_TYPES.has(t))
  ) {
    // Lightweight diagnostics (kept intentionally): confirms what Vapi emits.
    console.debug("[vapi-msg]", t, o.role ?? "", o.transcriptType ?? "");
  }

  // Assistant speech: the exact text Vapi sends to TTS (greeting included).
  if (t === "voice-input") {
    const input = typeof o.input === "string" ? o.input.trim() : "";
    if (!input) return lines;
    const last = lines[lines.length - 1];
    // Consecutive voice-input chunks belong to the same utterance — append.
    // Unless the bubble already covers this text (e.g. the greeting was seeded
    // client-side at call start and Vapi then emits voice-input for it too).
    if (last && last.source === "vi" && !last.isStreaming) {
      if (covers(last.committed || "", input)) return lines;
      const text = `${last.committed || ""} ${input}`.trim();
      return replaceLast(lines, {
        ...last,
        committed: text,
        text: format("assistant", text),
      });
    }
    return [
      ...lines,
      {
        id: newTranscriptLineId(),
        role: "transcript",
        streamRole: "assistant",
        isStreaming: false,
        committed: input,
        text: format("assistant", input),
        source: "vi",
      },
    ];
  }

  // Settled history (when Vapi sends it): rebuild committed bubbles, keeping
  // voice-input bubbles the update does not cover yet (greeting / in-flight
  // utterance) in their original position relative to the committed block.
  if (t === "conversation-update") {
    const bubbles = conversationBubbles(o);
    if (bubbles.length === 0) return lines;
    const system = lines.filter((l) => l.role === "system");

    const firstCommittedIdx = lines.findIndex(
      (l) => l.role === "transcript" && !l.isStreaming,
    );
    const keptVi = (predicate: (idx: number) => boolean) =>
      lines.filter(
        (l, idx) =>
          l.source === "vi" &&
          predicate(idx) &&
          !bubbles.some((b) => b.role === "assistant" && covers(b.text, l.committed || "")),
      );
    // Greeting-style bubbles that preceded any committed content stay in front;
    // an uncovered in-flight utterance stays at the tail.
    const viFront = keptVi((idx) => firstCommittedIdx !== -1 && idx <= firstCommittedIdx);
    const viTail = keptVi((idx) => firstCommittedIdx === -1 || idx > firstCommittedIdx);

    const committed: TranscriptChatLine[] = bubbles.map((b, i) => ({
      id: `cu-${i}-${b.role}`,
      role: "transcript",
      streamRole: b.role,
      isStreaming: false,
      committed: b.text,
      text: format(b.role, b.text),
      source: "cu",
    }));

    // Keep a live in-progress partial only if it isn't already committed.
    const live = lines.find((l) => l.isStreaming);
    const covered =
      live &&
      bubbles.some(
        (b) => b.role === live.streamRole && b.text === (live.committed || "").trim(),
      );
    return [...system, ...viFront, ...committed, ...viTail, ...(live && !covered ? [live] : [])];
  }

  // Live overlay: one trailing in-progress bubble from transcript partials
  // (customer finals land here too and settle immediately).
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
  // way a later conversation-update re-commits the turn authoritatively.
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
