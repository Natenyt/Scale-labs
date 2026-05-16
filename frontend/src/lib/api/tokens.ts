const ACCESS = "scalelabs:access";
const REFRESH = "scalelabs:refresh";
const ORG = "scalelabs:active_org_id";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ACCESS);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(REFRESH);
}

export function setTokens(access: string, refresh: string): void {
  sessionStorage.setItem(ACCESS, access);
  sessionStorage.setItem(REFRESH, refresh);
}

export function clearTokens(): void {
  sessionStorage.removeItem(ACCESS);
  sessionStorage.removeItem(REFRESH);
  sessionStorage.removeItem(ORG);
}

export function getActiveOrgId(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ORG);
}

export function setActiveOrgId(id: string): void {
  sessionStorage.setItem(ORG, id);
}
