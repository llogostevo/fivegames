"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  type GeoJSONSource,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  MAP_MAX_ZOOM,
} from "@/lib/map/provider";
import { loadMapStyle, setIdentifyingLabelsVisible } from "@/lib/map/style";
import { ensureMapLibreWorker } from "@/lib/map/worker";
import type { Coordinates } from "@/types/coordinates";

export type LockedMapGuess = {
  number: number;
  coordinates: Coordinates;
};

type GameMapProps = {
  initialCenter?: Coordinates;
  initialZoom?: number;
  /** Hide place names, POIs and other identifying labels on first load. */
  gameMode?: boolean;
  /** Show identifying labels (used for the reveal). */
  showLabels?: boolean;
  /** When false, map clicks do not place/move a pin. */
  interactive?: boolean;
  /** Current unlocked pin position (controlled). */
  pendingGuess?: Coordinates | null;
  /** Number drawn on the pending pin. */
  pendingNumber?: number;
  /** Permanently locked guesses shown as numbered controls. */
  lockedGuesses?: LockedMapGuess[];
  /** Mystery target shown after the game is complete. */
  target?: Coordinates | null;
  onSelect?: (coordinates: Coordinates) => void;
  /** Theme accent for the journey line (pins use CSS --course). */
  accentColor?: string;
  /** Overlays rendered on top of the map (hints, buttons). */
  children?: ReactNode;
  className?: string;
};

const COURSE_SOURCE_ID = "fg-course";
const DEFAULT_ACCENT = "#c4157a";
const FINISH_COLOR = "#1e1e24";

type LineFeature = GeoJSON.Feature<GeoJSON.LineString, { kind: string }>;

function createPinElement(
  label: string,
  variant: "pending" | "locked" | "finish",
) {
  const element = document.createElement("div");
  element.className = `fg-pin fg-pin--${variant}`;
  element.textContent = label;
  if (variant === "finish") {
    element.setAttribute("aria-label", "Answer location");
  }
  return element;
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function GameMap({
  initialCenter = DEFAULT_MAP_CENTER,
  initialZoom = DEFAULT_MAP_ZOOM,
  gameMode = true,
  showLabels = false,
  interactive = true,
  pendingGuess = null,
  pendingNumber = 1,
  lockedGuesses = [],
  target = null,
  accentColor = DEFAULT_ACCENT,
  onSelect,
  children,
  className,
}: GameMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const pendingMarkerRef = useRef<Marker | null>(null);
  const lockedMarkersRef = useRef<Marker[]>([]);
  const targetMarkerRef = useRef<Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  const interactiveRef = useRef(interactive);
  const accentColorRef = useRef(accentColor);
  const [mapReady, setMapReady] = useState(false);
  const [styleError, setStyleError] = useState<string | null>(null);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    interactiveRef.current = interactive;
    pendingMarkerRef.current?.setDraggable(interactive);
  }, [interactive]);

  useEffect(() => {
    accentColorRef.current = accentColor;
    const map = mapRef.current;
    if (!mapReady || !map || !map.getLayer("fg-course-line")) {
      return;
    }
    map.setPaintProperty("fg-course-line", "line-color", accentColor);
  }, [accentColor, mapReady]);

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
          attributionControl: { compact: true },
        });

        map.addControl(
          new NavigationControl({ showCompass: false }),
          "top-right",
        );

        map.on("click", (event) => {
          if (!interactiveRef.current) {
            return;
          }
          onSelectRef.current?.({
            lat: event.lngLat.lat,
            lng: event.lngLat.lng,
          });
        });

        map.on("load", () => {
          if (cancelled) {
            return;
          }
          map.addSource(COURSE_SOURCE_ID, {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          });
          map.addLayer({
            id: "fg-reveal-lines",
            type: "line",
            source: COURSE_SOURCE_ID,
            filter: ["==", ["get", "kind"], "reveal"],
            layout: { "line-cap": "round" },
            paint: {
              "line-color": FINISH_COLOR,
              "line-width": 1.5,
              "line-opacity": 0.55,
              "line-dasharray": [2, 2],
            },
          });
          map.addLayer({
            id: "fg-course-line",
            type: "line",
            source: COURSE_SOURCE_ID,
            filter: ["==", ["get", "kind"], "course"],
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": accentColorRef.current,
              "line-width": 2.5,
              "line-opacity": 0.85,
            },
          });
          setMapReady(true);
        });

        mapRef.current = map;
      } catch (error) {
        if (!cancelled) {
          setStyleError(
            error instanceof Error
              ? `The map couldn't load: ${error.message}. Refresh the page to try again.`
              : "The map couldn't load. Refresh the page to try again.",
          );
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

  // Pending pin: a filled control that can be dragged to fine-tune.
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
      pendingMarkerRef.current.setLngLat([pendingGuess.lng, pendingGuess.lat]);
      pendingMarkerRef.current.getElement().textContent = String(pendingNumber);
      return;
    }

    const marker = new Marker({
      element: createPinElement(String(pendingNumber), "pending"),
      anchor: "center",
      draggable: interactiveRef.current,
    })
      .setLngLat([pendingGuess.lng, pendingGuess.lat])
      .addTo(map);

    marker.on("dragend", () => {
      const { lat, lng } = marker.getLngLat();
      onSelectRef.current?.({ lat, lng });
    });

    pendingMarkerRef.current = marker;
  }, [mapReady, pendingGuess, pendingNumber]);

  // Locked pins + the course line joining them.
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) {
      return;
    }

    lockedMarkersRef.current.forEach((marker) => marker.remove());
    lockedMarkersRef.current = lockedGuesses.map((guess) =>
      new Marker({
        element: createPinElement(String(guess.number), "locked"),
        anchor: "center",
      })
        .setLngLat([guess.coordinates.lng, guess.coordinates.lat])
        .addTo(map),
    );

    const features: LineFeature[] = [];
    if (lockedGuesses.length > 1) {
      features.push({
        type: "Feature",
        properties: { kind: "course" },
        geometry: {
          type: "LineString",
          coordinates: lockedGuesses.map((guess) => [
            guess.coordinates.lng,
            guess.coordinates.lat,
          ]),
        },
      });
    }
    if (target) {
      for (const guess of lockedGuesses) {
        features.push({
          type: "Feature",
          properties: { kind: "reveal" },
          geometry: {
            type: "LineString",
            coordinates: [
              [guess.coordinates.lng, guess.coordinates.lat],
              [target.lng, target.lat],
            ],
          },
        });
      }
    }

    const source = map.getSource(COURSE_SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData({ type: "FeatureCollection", features });
  }, [mapReady, lockedGuesses, target]);

  // Finish marker, and zoom so every pin and the answer are in view.
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

    if (!targetMarkerRef.current) {
      targetMarkerRef.current = new Marker({
        element: createPinElement("", "finish"),
        anchor: "center",
      })
        .setLngLat([target.lng, target.lat])
        .addTo(map);
    } else {
      targetMarkerRef.current.setLngLat([target.lng, target.lat]);
    }

    const bounds = new LngLatBounds(
      [target.lng, target.lat],
      [target.lng, target.lat],
    );
    lockedGuesses.forEach((guess) => {
      if (guess.coordinates) {
        bounds.extend([guess.coordinates.lng, guess.coordinates.lat]);
      }
    });
    map.fitBounds(bounds, {
      padding: 72,
      maxZoom: 11,
      duration: prefersReducedMotion() ? 0 : 1400,
    });
    // Only re-fit when the target first appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, target]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) {
      return;
    }
    setIdentifyingLabelsVisible(map, showLabels);
  }, [mapReady, showLabels]);

  return (
    <div
      className={
        className ??
        "relative w-full overflow-hidden rounded-lg border border-rule bg-neutral-100"
      }
    >
      <div
        ref={containerRef}
        className={`absolute inset-0 ${interactive ? "fg-map--placing" : ""}`}
        role="application"
        aria-label="Map. Click or tap to place your pin."
      />
      {styleError ? (
        <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-muted">
          {styleError}
        </p>
      ) : null}
      {children}
    </div>
  );
}
