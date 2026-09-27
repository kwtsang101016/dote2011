/**
 * Anonymous usage logging for interactive lectures.
 * Posts to VITE_USAGE_LOG_URL when set (e.g. a Google Apps Script web app).
 * Never sends student names, IDs, or free-text answers — only course/lecture/scene metadata.
 */

export type UsageEventType = "session_start" | "scene_view" | "game_interact";

export type UsageEvent = {
  v: 1;
  type: UsageEventType;
  ts: string;
  course: string;
  lecture: string;
  sessionId: string;
  page?: number;
  sceneId?: string;
  chapter?: string;
  label?: string;
  isGame?: boolean;
  detail?: string;
};

const SESSION_KEY = "dote2011-usage-session-id";

function getEndpoint(): string {
  const raw = (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env
    .VITE_USAGE_LOG_URL;
  return typeof raw === "string" ? raw.trim() : "";
}

function createSessionId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* ignore */
  }
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getUsageSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const next = createSessionId();
    sessionStorage.setItem(SESSION_KEY, next);
    return next;
  } catch {
    return createSessionId();
  }
}

export function isGameChapter(chapter: string): boolean {
  const c = chapter.trim().toLowerCase();
  return c === "game" || c === "practice" || c.startsWith("game");
}

/** DOTE2011 often marks games in the scene label (e.g. "Game · classify"). */
export function isGameScene(chapter: string, label?: string): boolean {
  if (isGameChapter(chapter)) return true;
  const l = (label ?? "").trim().toLowerCase();
  return l.startsWith("game");
}

/** Fire-and-forget; safe no-op when endpoint is unset or network fails. */
export function logUsageEvent(
  partial: Omit<UsageEvent, "v" | "ts" | "sessionId"> & { sessionId?: string },
): void {
  const endpoint = getEndpoint();
  if (!endpoint || typeof window === "undefined") return;

  const event: UsageEvent = {
    v: 1,
    ts: new Date().toISOString(),
    sessionId: partial.sessionId ?? getUsageSessionId(),
    type: partial.type,
    course: partial.course,
    lecture: partial.lecture,
    page: partial.page,
    sceneId: partial.sceneId,
    chapter: partial.chapter,
    label: partial.label,
    isGame: partial.isGame,
    detail: partial.detail,
  };

  const body = JSON.stringify(event);
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
      if (navigator.sendBeacon(endpoint, blob)) return;
    }
  } catch {
    /* fall through */
  }
  void fetch(endpoint, {
    method: "POST",
    mode: "no-cors",
    keepalive: true,
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body,
  }).catch(() => {
    /* ignore */
  });
}
