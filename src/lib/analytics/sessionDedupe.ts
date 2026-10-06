/**
 * Session-scoped dedupe for analytics events (survives React Strict Mode remounts).
 */

function getSessionStorage(): Storage | null {
  try {
    if (typeof window === "undefined") {
      return null;
    }
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function claimAnalyticsOnce(key: string): boolean {
  const storage = getSessionStorage();
  if (!storage) {
    // If sessionStorage is unavailable, allow the event (best effort).
    return true;
  }
  try {
    if (storage.getItem(key)) {
      return false;
    }
    storage.setItem(key, "1");
    return true;
  } catch {
    return true;
  }
}

const startTimes = new Map<string, number>();

export function markGameStartTime(key: string, atMs: number = Date.now()): void {
  if (!startTimes.has(key)) {
    startTimes.set(key, atMs);
  }
}

export function takeGameDurationSeconds(key: string): number | null {
  const started = startTimes.get(key);
  if (typeof started !== "number") {
    return null;
  }
  startTimes.delete(key);
  return Math.max(0, Math.round((Date.now() - started) / 1000));
}
