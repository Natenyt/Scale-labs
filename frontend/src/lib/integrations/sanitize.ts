/**
 * Convert a human Notion property name into a safe JSON key
 * for use as a Vapi tool parameter name. Mirrors the helper from the
 * 10x prototype so generated tools stay stable across rebuilds.
 */
export function sanitizeKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[.]/g, "")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}
