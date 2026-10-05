"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  type GeoJSONSource,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import {
  SHORT_TAP_COACH_DURATION_MS,
  shortTapCoachMessage,
  shouldCoachShortTap,
} from "@/lib/game/holdTip";
import {
  holdProgress,
  shouldCancelHoldForMovement,
} from "@/lib/game/pinHold";
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
  /** When false, press-and-hold placement is disabled. */
  interactive?: boolean;
  /** Permanently locked guesses shown as numbered controls. */
  lockedGuesses?: LockedMapGuess[];
  /** Mystery target shown after the game is complete. */
  target?: Coordinates | null;
  /** Called once when a hold successfully commits a pin. */
  onCommit?: (coordinates: Coordinates) => void;
  /** Theme accent for the journey line (pins use CSS --course). */
  accentColor?: string;
  /** Overlays rendered on top of the map (hints, buttons). */
  children?: ReactNode;
  className?: string;
  /** Hide zoom controls (useful for compact result snapshots). */
  showControls?: boolean;
  /** Padding used when fitting the reveal bounds. */
  fitPadding?: number;
};

const COURSE_SOURCE_ID = "fg-course";
const DEFAULT_ACCENT = "#c4157a";
const FINISH_COLOR = "#1e1e24";
const HOLD_RING_SIZE = 56;

type LineFeature = GeoJSON.Feature<GeoJSON.LineString, { kind: string }>;

type HoldVisual = {
  lng: number;
  lat: number;
  progress: number;
  pulsing: boolean;
};

function createPinElement(
  label: string,
  variant: "locked" | "finish",
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

function HoldProgressRing({
  progress,
  pulsing,
}: {
  progress: number;
  pulsing: boolean;
}) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <div
      className={`fg-hold-ring${pulsing ? " fg-hold-ring--pulse" : ""}`}
      aria-hidden="true"
    >
      <svg width={HOLD_RING_SIZE} height={HOLD_RING_SIZE} viewBox="0 0 56 56">
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.85)"
          strokeWidth="4"
        />
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          stroke="var(--course)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 28 28)"
        />
        {progress >= 1 ? (
          <circle cx="28" cy="28" r="7" fill="var(--course)" />
        ) : null}
      </svg>
    </div>
  );
}

export function GameMap({
  initialCenter = DEFAULT_MAP_CENTER,
  initialZoom = DEFAULT_MAP_ZOOM,
  gameMode = true,
  showLabels = false,
  interactive = true,
  lockedGuesses = [],
  target = null,
  accentColor = DEFAULT_ACCENT,
  onCommit,
  children,
  className,
  showControls = true,
  fitPadding = 72,
}: GameMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const lockedMarkersRef = useRef<Marker[]>([]);
  const targetMarkerRef = useRef<Marker | null>(null);
  const onCommitRef = useRef(onCommit);
  const interactiveRef = useRef(interactive);
  const accentColorRef = useRef(accentColor);
  const submittingRef = useRef(false);
  const holdRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    lng: number;
    lat: number;
    startedAt: number;
    rafId: number | null;
    completed: boolean;
    /** True when movement exceeded tolerance (pan/drag — not a short tap). */
    moved: boolean;
  } | null>(null);
  const shortTapCountRef = useRef(0);
  const coachTimerRef = useRef<number | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [styleError, setStyleError] = useState<string | null>(null);
  const [holdVisual, setHoldVisual] = useState<HoldVisual | null>(null);
  const [holdScreen, setHoldScreen] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [coachMessage, setCoachMessage] = useState<string | null>(null);

  useEffect(() => {
    onCommitRef.current = onCommit;
  }, [onCommit]);

  useEffect(() => {
    interactiveRef.current = interactive;
    if (!interactive) {
      cancelHold();
    }
  }, [interactive]);

  useEffect(() => {
    submittingRef.current = !interactive;
  }, [interactive]);

  useEffect(() => {
    accentColorRef.current = accentColor;
    const map = mapRef.current;
    if (!mapReady || !map || !map.getLayer("fg-course-line")) {
      return;
    }
    map.setPaintProperty("fg-course-line", "line-color", accentColor);
  }, [accentColor, mapReady]);

  function clearCoachTimer() {
    if (coachTimerRef.current != null) {
      window.clearTimeout(coachTimerRef.current);
      coachTimerRef.current = null;
    }
  }

  function showShortTapCoach() {
    const message = shortTapCoachMessage(shortTapCountRef.current);
    shortTapCountRef.current += 1;
    clearCoachTimer();
    setCoachMessage(message);
    coachTimerRef.current = window.setTimeout(() => {
      setCoachMessage(null);
      coachTimerRef.current = null;
    }, SHORT_TAP_COACH_DURATION_MS);
  }

  function cancelHold() {
    const hold = holdRef.current;
    if (hold?.rafId != null) {
      cancelAnimationFrame(hold.rafId);
    }
    holdRef.current = null;
    setHoldVisual(null);
    setHoldScreen(null);
  }

  function projectHold(lng: number, lat: number) {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    const point = map.project([lng, lat]);
    setHoldScreen({ x: point.x, y: point.y });
  }

  function completeHold(lng: number, lat: number) {
    const hold = holdRef.current;
    if (!hold || hold.completed || submittingRef.current) {
      return;
    }
    hold.completed = true;
    if (hold.rafId != null) {
      cancelAnimationFrame(hold.rafId);
      hold.rafId = null;
    }

    setHoldVisual({ lng, lat, progress: 1, pulsing: true });
    projectHold(lng, lat);
    submittingRef.current = true;
    shortTapCountRef.current = 0;
    clearCoachTimer();
    setCoachMessage(null);

    // Briefly suppress drag so the leftover pointer doesn't pan the map.
    const map = mapRef.current;
    map?.dragPan.disable();
    window.setTimeout(() => {
      map?.dragPan.enable();
    }, 120);

    onCommitRef.current?.({ lat, lng });

    window.setTimeout(() => {
      if (holdRef.current?.completed) {
        holdRef.current = null;
        setHoldVisual(null);
        setHoldScreen(null);
      }
    }, prefersReducedMotion() ? 0 : 220);
  }

  function tickHold() {
    const hold = holdRef.current;
    if (!hold || hold.completed) {
      return;
    }

    const elapsed = performance.now() - hold.startedAt;
    const progress = holdProgress(elapsed);
    setHoldVisual({
      lng: hold.lng,
      lat: hold.lat,
      progress,
      pulsing: false,
    });
    projectHold(hold.lng, hold.lat);

    if (progress >= 1) {
      completeHold(hold.lng, hold.lat);
      return;
    }

    hold.rafId = requestAnimationFrame(tickHold);
  }

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

        if (showControls) {
          map.addControl(
            new NavigationControl({ showCompass: false }),
            "top-right",
          );
        }

        const canvas = map.getCanvas();

        const onPointerDown = (event: PointerEvent) => {
          if (!interactiveRef.current || submittingRef.current) {
            return;
          }
          if (event.pointerType === "mouse" && event.button !== 0) {
            return;
          }
          // Ignore multi-touch (pinch / two-finger pan).
          if (event.isPrimary === false) {
            return;
          }

          const rect = canvas.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;
          const lngLat = map.unproject([x, y]);

          cancelHold();
          holdRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            lng: lngLat.lng,
            lat: lngLat.lat,
            startedAt: performance.now(),
            rafId: requestAnimationFrame(tickHold),
            completed: false,
            moved: false,
          };
          setHoldVisual({
            lng: lngLat.lng,
            lat: lngLat.lat,
            progress: 0,
            pulsing: false,
          });
          setHoldScreen({ x, y });
        };

        const onPointerMove = (event: PointerEvent) => {
          const hold = holdRef.current;
          if (!hold || hold.completed || event.pointerId !== hold.pointerId) {
            return;
          }
          if (
            shouldCancelHoldForMovement(
              hold.startX,
              hold.startY,
              event.clientX,
              event.clientY,
            )
          ) {
            // Pan/drag — cancel quietly; do not coach.
            hold.moved = true;
            cancelHold();
          }
        };

        const onPointerUp = (event: PointerEvent) => {
          const hold = holdRef.current;
          if (!hold || event.pointerId !== hold.pointerId) {
            return;
          }
          if (!hold.completed) {
            const coach = shouldCoachShortTap({
              completed: hold.completed,
              moved: hold.moved,
            });
            cancelHold();
            if (coach) {
              showShortTapCoach();
            }
          }
        };

        const onContextMenu = (event: Event) => {
          if (interactiveRef.current) {
            event.preventDefault();
          }
        };

        canvas.addEventListener("pointerdown", onPointerDown);
        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
        window.addEventListener("pointercancel", onPointerUp);
        canvas.addEventListener("contextmenu", onContextMenu);

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
          map.resize();
          setMapReady(true);
        });

        // Keep the hold ring anchored while the map pans/zooms.
        map.on("move", () => {
          const hold = holdRef.current;
          const visual = hold
            ? { lng: hold.lng, lat: hold.lat }
            : null;
          if (visual) {
            projectHold(visual.lng, visual.lat);
          }
        });

        mapRef.current = map;

        // Cleanup listeners with the map instance.
        (
          map as MapLibreMap & {
            __pin5HoldCleanup?: () => void;
          }
        ).__pin5HoldCleanup = () => {
          canvas.removeEventListener("pointerdown", onPointerDown);
          window.removeEventListener("pointermove", onPointerMove);
          window.removeEventListener("pointerup", onPointerUp);
          window.removeEventListener("pointercancel", onPointerUp);
          canvas.removeEventListener("contextmenu", onContextMenu);
        };
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
      cancelHold();
      clearCoachTimer();
      setMapReady(false);
      const map = mapRef.current as
        | (MapLibreMap & { __pin5HoldCleanup?: () => void })
        | null;
      map?.__pin5HoldCleanup?.();
      lockedMarkersRef.current.forEach((marker) => marker.remove());
      lockedMarkersRef.current = [];
      targetMarkerRef.current?.remove();
      targetMarkerRef.current = null;
      map?.remove();
      mapRef.current = null;
    };
    // Intentionally mount-only: initial view / gameMode apply on first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const map = mapRef.current;
    if (!mapReady || !container || !map) {
      return;
    }

    const observer = new ResizeObserver(() => {
      map.resize();
    });
    observer.observe(container);
    map.resize();

    return () => observer.disconnect();
  }, [mapReady]);

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
      padding: fitPadding,
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

  function commitAtMapCentre() {
    const map = mapRef.current;
    if (!map || !interactiveRef.current || submittingRef.current) {
      return;
    }
    const center = map.getCenter();
    submittingRef.current = true;
    onCommitRef.current?.({ lat: center.lat, lng: center.lng });
  }

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
        aria-label="Map. Press and hold to place your pin. Keep holding until the circle fills."
      />
      {holdVisual && holdScreen ? (
        <div
          className="pointer-events-none absolute z-10"
          style={{
            left: holdScreen.x,
            top: holdScreen.y,
            width: HOLD_RING_SIZE,
            height: HOLD_RING_SIZE,
            transform: "translate(-50%, -50%)",
          }}
        >
          <HoldProgressRing
            progress={holdVisual.progress}
            pulsing={holdVisual.pulsing}
          />
        </div>
      ) : null}
      {coachMessage ? (
        <p
          role="status"
          aria-live="polite"
          className="fg-hold-coach pointer-events-none absolute bottom-3 left-1/2 z-20 max-w-[min(18rem,calc(100%-1.5rem))] -translate-x-1/2 rounded-md bg-foreground/90 px-3 py-2 text-center text-sm font-semibold text-white shadow-md"
        >
          {coachMessage}
        </p>
      ) : null}
      {interactive ? (
        <button
          type="button"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-20 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-md"
          onClick={commitAtMapCentre}
        >
          Press and hold — or place pin at map centre
        </button>
      ) : null}
      {styleError ? (
        <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-muted">
          {styleError}
        </p>
      ) : null}
      {children}
    </div>
  );
}
