/**
 * Vapi client transcript messages (`ClientMessageTranscript`) send many
 * `transcriptType: "partial"` updates per utterance, then one `"final"`.
 * Appending each event as a new row duplicates text — stream into one row
 * until `final`, then dedupe identical consecutive finals.
 */

export type TranscriptChatLine = {
  id: string;
  role: "system" | "transcript";
  text: string;
  streamRole?: "assistant" | "user";
  isStreaming?: boolean;
};

export function newTranscriptLineId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function mergeVapiClientMessage(
  lines: TranscriptChatLine[],
  raw: unknown,
): TranscriptChatLine[] {
  if (!raw || typeof raw !== "object") return lines;
  const o = raw as Record<string, unknown>;
  const t = typeof o.type === "string" ? o.type : "";

  if (t === "model-output" && typeof o.output === "string") {
    const m = o.output.trim();
    if (!m) return lines;
    const display = `[assistant] ${m}`;
    const last = lines[lines.length - 1];
    if (last?.role === "transcript" && last.text === display) return lines;
    return dedupeAdjacentIdenticalTranscripts([
      ...lines,
      {
        id: newTranscriptLineId(),
        role: "transcript",
        text: display,
        streamRole: "assistant",
        isStreaming: false,
      },
    ]);
  }

  if (
    t !== "transcript" &&
    t !== "transcript[transcriptType='final']" &&
    t !== "transcript-update"
  ) {
    return lines;
  }

  const streamRole: "assistant" | "user" = o.role === "user" ? "user" : "assistant";
  const body =
    typeof o.transcript === "string"
      ? o.transcript
      : typeof o.transcriptPartial === "string"
        ? o.transcriptPartial
        : typeof o.text === "string"
          ? o.text
          : "";
  const trimmed = body.trim();
  if (!trimmed) return lines;

  const transcriptType: "partial" | "final" =
    o.transcriptType === "final" || t === "transcript[transcriptType='final']"
      ? "final"
      : o.transcriptType === "partial"
        ? "partial"
        : "partial";

  const display = `[${streamRole}] ${trimmed}`;

  let streamingIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (
      line.role === "transcript" &&
      line.streamRole === streamRole &&
      line.isStreaming === true
    ) {
      streamingIdx = i;
      break;
    }
  }

  if (transcriptType === "partial") {
    if (streamingIdx >= 0) {
      return lines.map((line, i) =>
        i === streamingIdx ? { ...line, text: display } : line,
      );
    }
    return [
      ...lines,
      {
        id: newTranscriptLineId(),
        role: "transcript",
        text: display,
        streamRole,
        isStreaming: true,
      },
    ];
  }

  if (streamingIdx >= 0) {
    const next = lines.map((line, i) =>
      i === streamingIdx
        ? { ...line, text: display, isStreaming: false }
        : line,
    );
    return dedupeAdjacentIdenticalTranscripts(next);
  }

  const last = lines[lines.length - 1];
  if (
    last?.role === "transcript" &&
    last.text === display &&
    last.isStreaming !== true
  ) {
    return lines;
  }

  return dedupeAdjacentIdenticalTranscripts([
    ...lines,
    {
      id: newTranscriptLineId(),
      role: "transcript",
      text: display,
      streamRole,
      isStreaming: false,
    },
  ]);
}

function dedupeAdjacentIdenticalTranscripts(
  lines: TranscriptChatLine[],
): TranscriptChatLine[] {
  if (lines.length < 2) return lines;
  const a = lines[lines.length - 2];
  const b = lines[lines.length - 1];
  if (
    a?.role === "transcript" &&
    b?.role === "transcript" &&
    a.text === b.text &&
    !a.isStreaming &&
    !b.isStreaming
  ) {
    return lines.slice(0, -1);
  }
  return lines;
}
