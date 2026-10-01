"use client";

import { useEffect, useRef, useState } from "react";
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  MAP_MAX_ZOOM,
} from "@/lib/map/provider";
import { loadMapStyle } from "@/lib/map/style";
import { ensureMapLibreWorker } from "@/lib/map/worker";
import type { Coordinates } from "@/types/coordinates";

export type LockedMapGuess = {
  number: number;
  coordinates: Coordinates;
};

type GameMapProps = {
  initialCenter?: Coordinates;
  initialZoom?: number;
  /**
   * When true (default), hide place names, POIs, and other identifying labels.
   * Set to false later for a labelled reveal map.
   */
  gameMode?: boolean;
  /** When false, map clicks do not place/move a pin. */
  interactive?: boolean;
  /** Current unlocked pin position (controlled). */
  pendingGuess?: Coordinates | null;
  /** Permanently locked guesses shown as numbered markers. */
  lockedGuesses?: LockedMapGuess[];
  /** Mystery target shown after the game is complete. */
  target?: Coordinates | null;
  onSelect?: (coordinates: Coordinates) => void;
  className?: string;
};

function createNumberedMarkerElement(label: string, variant: "locked" | "target") {
  const element = document.createElement("div");
  element.className =
    variant === "target"
      ? "flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-emerald-600 text-xs font-bold text-white shadow"
      : "flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-neutral-900 text-xs font-bold text-white shadow";
  element.textContent = label;
  return element;
}

export function GameMap({
  initialCenter = DEFAULT_MAP_CENTER,
  initialZoom = DEFAULT_MAP_ZOOM,
  gameMode = true,
  interactive = true,
  pendingGuess = null,
  lockedGuesses = [],
  target = null,
  onSelect,
  className,
}: GameMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const pendingMarkerRef = useRef<Marker | null>(null);
  const lockedMarkersRef = useRef<Marker[]>([]);
  const targetMarkerRef = useRef<Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  const interactiveRef = useRef(interactive);
  const [mapReady, setMapReady] = useState(false);
  const [styleError, setStyleError] = useState<string | null>(null);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    interactiveRef.current = interactive;
  }, [interactive]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) {
      return;
    }

    let cancelled = false;

    async function initialiseMap() {
      try {
        ensureMapLibreWorker();
        const style = await loadMapStyle({ gameMode });

        if (cancelled || !containerRef.current) {
          return;
        }

        const map = new MapLibreMap({
          container: containerRef.current,
          style,
          center: [initialCenter.lng, initialCenter.lat],
          zoom: initialZoom,
          maxZoom: MAP_MAX_ZOOM,
          attributionControl: {
            compact: true,
          },
        });

        map.addControl(
          new NavigationControl({ showCompass: false }),
          "top-right",
        );

        map.on("click", (event) => {
          if (!interactiveRef.current) {
            return;
          }

          const coordinates: Coordinates = {
            lat: event.lngLat.lat,
            lng: event.lngLat.lng,
          };

          onSelectRef.current?.(coordinates);
        });

        mapRef.current = map;
        if (!cancelled) {
          setMapReady(true);
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : "Failed to load map";
          setStyleError(message);
        }
      }
    }

    void initialiseMap();

    return () => {
      cancelled = true;
      setMapReady(false);
      pendingMarkerRef.current?.remove();
      pendingMarkerRef.current = null;
      lockedMarkersRef.current.forEach((marker) => marker.remove());
      lockedMarkersRef.current = [];
      targetMarkerRef.current?.remove();
      targetMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // Intentionally mount-only: initial view / gameMode apply on first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) {
      return;
    }

    if (!pendingGuess) {
      pendingMarkerRef.current?.remove();
      pendingMarkerRef.current = null;
      return;
    }

    if (pendingMarkerRef.current) {
      pendingMarkerRef.current.setLngLat([
        pendingGuess.lng,
        pendingGuess.lat,
      ]);
      return;
    }

    pendingMarkerRef.current = new Marker({ color: "#111827" })
      .setLngLat([pendingGuess.lng, pendingGuess.lat])
      .addTo(map);
  }, [mapReady, pendingGuess]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) {
      return;
    }

    lockedMarkersRef.current.forEach((marker) => marker.remove());
    lockedMarkersRef.current = lockedGuesses.map((guess) =>
      new Marker({
        element: createNumberedMarkerElement(String(guess.number), "locked"),
        anchor: "center",
      })
        .setLngLat([guess.coordinates.lng, guess.coordinates.lat])
        .addTo(map),
    );
  }, [mapReady, lockedGuesses]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) {
      return;
    }

    if (!target) {
      targetMarkerRef.current?.remove();
      targetMarkerRef.current = null;
      return;
    }

    if (targetMarkerRef.current) {
      targetMarkerRef.current.setLngLat([target.lng, target.lat]);
      return;
    }

    targetMarkerRef.current = new Marker({
      element: createNumberedMarkerElement("★", "target"),
      anchor: "center",
    })
      .setLngLat([target.lng, target.lat])
      .addTo(map);
  }, [mapReady, target]);

  return (
    <div
      ref={containerRef}
      className={
        className ??
        "relative h-[min(70vh,36rem)] w-full overflow-hidden rounded-lg border border-black/10 bg-neutral-100"
      }
      role="application"
      aria-label="Interactive map"
    >
      {styleError ? (
        <p className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-neutral-600">
          {styleError}
        </p>
      ) : null}
    </div>
  );
}
