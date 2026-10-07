/**
 * Diagnostic helpers for MapLibre init failures (esp. iOS Safari).
 * Logging only — does not change map behaviour.
 * Enable with `?mapdiag=1` on the page URL.
 */

export const MAP_DIAG_PREFIX = "[pin5-map]";
export const MAP_DIAG_QUERY_PARAM = "mapdiag";

const MAX_BUFFERED_ENTRIES = 200;

export type MapDiagEnvironment = {
  containerWidth: number;
  containerHeight: number;
  innerWidth: number;
  innerHeight: number;
  devicePixelRatio: number;
  userAgent: string;
  webgl2: {
    ok: boolean;
    statusMessage: string | null;
  };
};

type MapDiagEntry = {
  at: string;
  event: string;
  details?: Record<string, unknown>;
};

const diagBuffer: MapDiagEntry[] = [];
const listeners = new Set<() => void>();

function notifyDiagListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore subscriber errors.
    }
  });
}

/** Subscribe to buffer changes (for the copy-button count). */
export function subscribeMapDiag(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getMapDiagEntryCount(): number {
  return diagBuffer.length;
}

/** True when the page URL includes `?mapdiag=1` (or truthy mapdiag). */
export function isMapDiagEnabled(): boolean {
  try {
    if (typeof window === "undefined") {
      return false;
    }
    const value = new URLSearchParams(window.location.search)
      .get(MAP_DIAG_QUERY_PARAM)
      ?.trim()
      .toLowerCase();
    return value === "1" || value === "true" || value === "yes";
  } catch {
    return false;
  }
}

export function probeWebGL2Support(): {
  ok: boolean;
  statusMessage: string | null;
} {
  if (typeof document === "undefined") {
    return { ok: false, statusMessage: "no document" };
  }
  try {
    const canvas = document.createElement("canvas");
    let statusMessage: string | null = null;
    const onCreationError = (event: Event) => {
      const webglEvent = event as WebGLContextEvent;
      statusMessage = webglEvent.statusMessage || "webglcontextcreationerror";
    };
    canvas.addEventListener("webglcontextcreationerror", onCreationError);
    const gl = canvas.getContext("webgl2", {
      antialias: false,
      failIfMajorPerformanceCaveat: false,
    });
    canvas.removeEventListener("webglcontextcreationerror", onCreationError);
    if (!gl) {
      return {
        ok: false,
        statusMessage: statusMessage ?? "getContext('webgl2') returned null",
      };
    }
    const lose = gl.getExtension("WEBGL_lose_context");
    lose?.loseContext();
    return { ok: true, statusMessage: null };
  } catch (error) {
    return {
      ok: false,
      statusMessage:
        error instanceof Error ? error.message : "webgl2 probe threw",
    };
  }
}

export function collectMapEnvironment(
  container: HTMLElement | null | undefined,
): MapDiagEnvironment {
  const rect = container?.getBoundingClientRect();
  return {
    containerWidth: Math.round(rect?.width ?? 0),
    containerHeight: Math.round(rect?.height ?? 0),
    innerWidth: typeof window !== "undefined" ? window.innerWidth : 0,
    innerHeight: typeof window !== "undefined" ? window.innerHeight : 0,
    devicePixelRatio:
      typeof window !== "undefined" ? window.devicePixelRatio : 1,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    webgl2: probeWebGL2Support(),
  };
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function logMapDiag(
  event: string,
  details?: Record<string, unknown>,
): void {
  if (!isMapDiagEnabled()) {
    return;
  }
  try {
    const entry: MapDiagEntry = {
      at: new Date().toISOString(),
      event,
      details,
    };
    diagBuffer.push(entry);
    if (diagBuffer.length > MAX_BUFFERED_ENTRIES) {
      diagBuffer.splice(0, diagBuffer.length - MAX_BUFFERED_ENTRIES);
    }
    notifyDiagListeners();

    if (details) {
      console.warn(MAP_DIAG_PREFIX, event, details);
    } else {
      console.warn(MAP_DIAG_PREFIX, event);
    }
  } catch {
    // Never break gameplay for diagnostics.
  }
}

/** Plain-text report suitable for pasting into email. */
export function formatMapDiagReport(): string {
  const href =
    typeof window !== "undefined" ? window.location.href : "(unknown url)";
  const lines = [
    "Pin5 map diagnostics",
    `Captured: ${new Date().toISOString()}`,
    `URL: ${href}`,
    `Entries: ${diagBuffer.length}`,
    "",
  ];
  for (const entry of diagBuffer) {
    lines.push(`[${entry.at}] ${entry.event}`);
    if (entry.details) {
      lines.push(safeJson(entry.details));
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

async function writeClipboardText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to legacy path.
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    area.style.top = "0";
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/** Copy the buffered diagnostic report to the clipboard. */
export async function copyMapDiagReport(): Promise<boolean> {
  if (!isMapDiagEnabled()) {
    return false;
  }
  return writeClipboardText(formatMapDiagReport());
}

export function describeUnknownError(error: unknown): Record<string, unknown> {
  if (!error || typeof error !== "object") {
    return { message: String(error) };
  }
  const record = error as Record<string, unknown>;
  return {
    name: typeof record.name === "string" ? record.name : undefined,
    message: typeof record.message === "string" ? record.message : String(error),
    statusMessage:
      typeof record.statusMessage === "string" ? record.statusMessage : undefined,
    stack: typeof record.stack === "string" ? record.stack : undefined,
  };
}
