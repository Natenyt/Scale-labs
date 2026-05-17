/** Presentation / screenshot workspace — sign in on the login page. */
export const DEMO_ACCOUNT_EMAIL = "demo@acme.inc";
export const DEMO_ACCOUNT_PASSWORD = "AcmeDemo2026!";
export const DEMO_ORG_NAME = "Acme Inc";
export const DEMO_ORG_SLUG = "acme-inc";
export const DEMO_SESSION_KEY = "scalelabs:demo-workspace";

export const DEMO_USER = {
  id: -1,
  email: DEMO_ACCOUNT_EMAIL,
  organizations: [
    {
      id: -1,
      name: DEMO_ORG_NAME,
      slug: DEMO_ORG_SLUG,
      kind: "organization",
    },
  ],
} satisfies {
  id: number;
  email: string;
  organizations: { id: number; name: string; slug: string; kind: string }[];
};

export function isDemoCredentials(email: string, password: string): boolean {
  return (
    email.trim().toLowerCase() === DEMO_ACCOUNT_EMAIL &&
    password === DEMO_ACCOUNT_PASSWORD
  );
}

export function isDemoSession(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(DEMO_SESSION_KEY) === "1";
}

export function setDemoSession(active: boolean): void {
  if (typeof window === "undefined") return;
  if (active) {
    window.sessionStorage.setItem(DEMO_SESSION_KEY, "1");
    window.sessionStorage.setItem("scalelabs:active-org-id", "-1");
  } else {
    window.sessionStorage.removeItem(DEMO_SESSION_KEY);
  }
}

export function isDemoWorkspaceUser(
  user: { email: string } | null | undefined,
): boolean {
  if (!user) return isDemoSession();
  return user.email.trim().toLowerCase() === DEMO_ACCOUNT_EMAIL;
}
