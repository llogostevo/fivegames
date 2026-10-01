import { getVersion, setWorkerUrl } from "maplibre-gl";

let configured = false;

/**
 * Configure the MapLibre worker URL for Next.js/Turbopack builds.
 * Without this, the map paints only a background color and never loads tiles.
 */
export function ensureMapLibreWorker(): void {
  if (configured || typeof window === "undefined") {
    return;
  }

  setWorkerUrl(`/maplibre/${getVersion()}/maplibre-gl-worker.mjs`);
  configured = true;
}
