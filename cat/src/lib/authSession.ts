const STORAGE_KEY = "dote2011-cat-auth-v1";

export interface AuthSession {
  instructorSecret?: string;
  /** personId -> PIN entered by the user (session only) */
  secrets: Record<string, string>;
}

export function loadAuthSession(): AuthSession {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { secrets: {} };
    }
    const parsed = JSON.parse(raw) as AuthSession;
    return {
      instructorSecret: typeof parsed.instructorSecret === "string" ? parsed.instructorSecret : undefined,
      secrets: parsed.secrets && typeof parsed.secrets === "object" ? parsed.secrets : {},
    };
  } catch {
    return { secrets: {} };
  }
}

export function saveAuthSession(session: AuthSession): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function rememberPersonSecret(personId: string, secret: string): AuthSession {
  const session = loadAuthSession();
  session.secrets[personId] = secret;
  saveAuthSession(session);
  return session;
}

export function rememberInstructorSecret(secret: string): AuthSession {
  const session = loadAuthSession();
  session.instructorSecret = secret;
  saveAuthSession(session);
  return session;
}

export function clearAuthSession(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
