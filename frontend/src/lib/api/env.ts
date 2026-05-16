export function apiBaseUrl(): string | null {
  const u = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  return u ? u.replace(/\/$/, "") : null;
}

export function hasBackendApi(): boolean {
  return Boolean(apiBaseUrl());
}
