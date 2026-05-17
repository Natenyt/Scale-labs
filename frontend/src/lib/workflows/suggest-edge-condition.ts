/**
 * Heuristic edge-condition text from a conversation node's system prompt.
 * Mirrors Vapi-style pills ("User said yes") when the prompt describes branches.
 */

export type SuggestEdgeConditionOptions = {
  /** Which outgoing branch from this source (0 = first "if …" in the prompt). */
  branchIndex?: number;
};

export function suggestEdgeConditionFromPrompt(
  prompt: string | undefined,
  options?: SuggestEdgeConditionOptions,
): string | undefined {
  const text = (prompt ?? "").trim();
  if (!text) return undefined;

  const branches = extractBranchConditions(text);
  if (branches.length > 0) {
    const idx = options?.branchIndex ?? 0;
    return branches[idx] ?? branches[branches.length - 1];
  }

  return extractSingleCondition(text);
}

function extractBranchConditions(text: string): string[] {
  const out: string[] = [];

  const ifRegex =
    /\bif\s+(?:the\s+)?(?:user\s+)?(?:says?|said|confirms?|agrees?|responds?\s+with)?\s*["']?([^"'.!?\n,;]+)["']?/gi;
  let m: RegExpExecArray | null;
  while ((m = ifRegex.exec(text)) !== null) {
    const phrase = formatAiCondition(m[1]);
    if (phrase && !out.includes(phrase)) out.push(phrase);
  }

  const whenRegex =
    /\bwhen\s+(?:the\s+)?user\s+(?:wants?\s+to|needs?\s+to|asks?\s+(?:for|to))\s+([^.;!\n]+)/gi;
  while ((m = whenRegex.exec(text)) !== null) {
    const raw = m[1].trim();
    if (raw.length < 4 || raw.length > 72) continue;
    const phrase = capitalizeFirst(raw);
    if (!out.includes(phrase)) out.push(phrase);
  }

  return out;
}

function extractSingleCondition(text: string): string | undefined {
  const userSaid = text.match(
    /\buser\s+(?:says?|said|confirms?|agrees?)\s+["']?(\w+)["']?/i,
  );
  if (userSaid) return formatAiCondition(userSaid[1]);

  const ifYesNo = text.match(/\bif\s+(yes|no)\b/i);
  if (ifYesNo) return formatAiCondition(ifYesNo[1]);

  const wants = text.match(
    /\buser\s+(?:wants?\s+to|needs?\s+to)\s+([^.;!\n]+)/i,
  );
  if (wants) {
    const raw = wants[1].trim();
    if (raw.length >= 4 && raw.length <= 72) return capitalizeFirst(raw);
  }

  return undefined;
}

function formatAiCondition(fragment: string): string | undefined {
  const t = fragment.trim().replace(/^to\s+/i, "");
  if (!t) return undefined;

  if (/^(yes|no|maybe|sure|ok|okay|correct|incorrect)$/i.test(t)) {
    return `User said ${t.toLowerCase()}`;
  }

  if (t.length > 72) return undefined;

  const lower = t.toLowerCase();
  if (lower.startsWith("user ")) return capitalizeFirst(t);

  if (/^(schedule|book|cancel|transfer|speak|talk)/i.test(t)) {
    return `User wants to ${lower}`;
  }

  return capitalizeFirst(t);
}

function capitalizeFirst(s: string): string {
  const t = s.trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}
