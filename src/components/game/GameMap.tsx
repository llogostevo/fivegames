"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  GPUInitializationError,
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
  holdRingSizePx,
  shouldCancelHoldForMovement,
  triggerPinCommitHaptic,
} from "@/lib/game/pinHold";
import {
  collectMapEnvironment,
  copyMapDiagReport,
  describeUnknownError,
  getMapDiagEntryCount,
  isMapDiagEnabled,
  logMapDiag,
  subscribeMapDiag,
} from "@/lib/map/diagnostics";
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  MAP_MAX_ZOOM,
  type MapProjection,
} from "@/lib/map/provider";
import {
  DEFAULT_MAP_LABELS,
  loadMapStyle,
  setIdentifyingLabelsVisible,
  setMapLabelPreset,
  type MapLabelPreset,
} from "@/lib/map/style";
import { ensureMapLibreWorker } from "@/lib/map/worker";
import type { Coordinates } from "@/types/coordinates";

export type LockedMapGuess = {
  number: number;
  coordinates: Coordinates;
};

type GameMapProps = {
  initialCenter?: Coordinates;
  initialZoom?: number;
  /** Opening projection (globe for World). */
  initialProjection?: MapProjection;
  /** Hide place names, POIs and other identifying labels on first load. */
  gameMode?: boolean;
  /** Play-time label groups (ignored when showLabels is true). */
  mapLabels?: MapLabelPreset;
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

function MapDiagCopyButton() {
  const [enabled, setEnabled] = useState(false);
  const count = useSyncExternalStore(
    subscribeMapDiag,
    getMapDiagEntryCount,
    () => 0,
  );
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    setEnabled(isMapDiagEnabled());
  }, []);

  useEffect(() => {
    if (status === "idle") {
      return;
    }
    const timer = window.setTimeout(() => setStatus("idle"), 2000);
    return () => window.clearTimeout(timer);
  }, [status]);

  if (!enabled) {
    return null;
  }

  return (
    <button
      type="button"
      className="absolute left-3 top-3 z-30 rounded-md bg-foreground/90 px-2.5 py-1.5 text-xs font-semibold text-white shadow-md"
      onClick={() => {
        void copyMapDiagReport().then((ok) => {
          setStatus(ok ? "copied" : "failed");
        });
      }}
    >
      {status === "copied"
        ? "Copied — paste into email"
        : status === "failed"
          ? "Copy failed"
          : `Copy map logs (${count})`}
    </button>
  );
}

function HoldProgressRing({
  progress,
  pulsing,
  size,
}: {
  progress: number;
  pulsing: boolean;
  size: number;
}) {
  const center = size / 2;
  const stroke = size >= 80 ? 5.5 : 4;
  const radius = center - stroke - 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);
  const innerDot = size >= 80 ? 8 : 7;

  return (
    <div
      className={`fg-hold-ring${pulsing ? " fg-hold-ring--pulse" : ""}`}
      aria-hidden="true"
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.85)"
          strokeWidth={stroke}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--course)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${center} ${center})`}
        />
        {progress >= 1 ? (
          <circle cx={center} cy={center} r={innerDot} fill="var(--course)" />
        ) : null}
      </svg>
    </div>
  );
}

export function GameMap({
  initialCenter = DEFAULT_MAP_CENTER,
  initialZoom = DEFAULT_MAP_ZOOM,
  initialProjection = "mercator",
  gameMode = true,
  mapLabels = DEFAULT_MAP_LABELS,
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
    pointerType: string;
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
  /** Exact commit point — ring is centred here (larger on touch). */
  const [holdScreen, setHoldScreen] = useState<{
    x: number;
    y: number;
    ringSize: number;
  } | null>(null);
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

  function setHoldScreenFromPoint(
    x: number,
    y: number,
    pointerType: string,
  ) {
    setHoldScreen({
      x,
      y,
      ringSize: holdRingSizePx(pointerType),
    });
  }

  function projectHold(lng: number, lat: number, pointerType: string) {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    const point = map.project([lng, lat]);
    setHoldScreenFromPoint(point.x, point.y, pointerType);
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
    projectHold(lng, lat, hold.pointerType);
    submittingRef.current = true;
    shortTapCountRef.current = 0;
    clearCoachTimer();
    setCoachMessage(null);
    triggerPinCommitHaptic();

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
    projectHold(hold.lng, hold.lat, hold.pointerType);

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
      const diag = isMapDiagEnabled();
      if (diag) {
        const env = collectMapEnvironment(container);
        logMapDiag("init:start", {
          ...env,
          workerPathHint: "/maplibre/<version>/maplibre-gl-worker.mjs",
        });

        if (env.containerWidth < 2 || env.containerHeight < 2) {
          logMapDiag("init:zero-size-container", {
            containerWidth: env.containerWidth,
            containerHeight: env.containerHeight,
          });
        }

        if (!env.webgl2.ok) {
          logMapDiag("init:webgl2-probe-failed", {
            statusMessage: env.webgl2.statusMessage,
            userAgent: env.userAgent,
          });
        }
      }

      try {
        ensureMapLibreWorker();
        logMapDiag("init:worker-configured");

        const style = await loadMapStyle({ gameMode, mapLabels });
        logMapDiag("init:style-loaded", {
          styleUrl: "https://tiles.openfreemap.org/styles/liberty",
        });

        if (cancelled || !containerRef.current) {
          return;
        }

        if (diag) {
          const envAfterStyle = collectMapEnvironment(containerRef.current);
          logMapDiag("init:before-map-constructor", {
            containerWidth: envAfterStyle.containerWidth,
            containerHeight: envAfterStyle.containerHeight,
          });
        }

        let map: MapLibreMap;
        try {
          map = new MapLibreMap({
            container: containerRef.current,
            style,
            center: [initialCenter.lng, initialCenter.lat],
            zoom: initialZoom,
            maxZoom: MAP_MAX_ZOOM,
            attributionControl: { compact: true },
          });
        } catch (constructError) {
          const details = describeUnknownError(constructError);
          if (constructError instanceof GPUInitializationError) {
            logMapDiag("error:GPUInitializationError", {
              ...details,
              statusMessage: constructError.statusMessage,
              requestedAttributes: constructError.requestedAttributes,
              environment: diag
                ? collectMapEnvironment(containerRef.current)
                : undefined,
            });
          } else {
            logMapDiag("error:map-constructor", {
              ...details,
              environment: diag
                ? collectMapEnvironment(containerRef.current)
                : undefined,
            });
          }
          throw constructError;
        }

        map.on("error", (event) => {
          const error = event.error;
          if (error instanceof GPUInitializationError) {
            logMapDiag("error:map-event-GPUInitializationError", {
              ...describeUnknownError(error),
              statusMessage: error.statusMessage,
            });
            return;
          }
          logMapDiag("error:map-event", {
            ...describeUnknownError(error),
            // MapLibre sometimes attaches source/tile URLs on the error object.
            url:
              error && typeof error === "object" && "url" in error
                ? String((error as { url?: unknown }).url)
                : undefined,
          });
        });

        if (showControls) {
          map.addControl(
            new NavigationControl({ showCompass: false }),
            "top-right",
          );
        }

        const canvas = map.getCanvas();

        const onContextLost = (event: Event) => {
          event.preventDefault();
          logMapDiag("webgl:contextlost", {
            environment: diag
              ? collectMapEnvironment(containerRef.current ?? container)
              : undefined,
          });
        };
        const onContextRestored = () => {
          logMapDiag("webgl:contextrestored", {
            environment: diag
              ? collectMapEnvironment(containerRef.current ?? container)
              : undefined,
          });
          try {
            map.resize();
          } catch (resizeError) {
            logMapDiag("webgl:contextrestored-resize-failed", {
              ...describeUnknownError(resizeError),
            });
          }
        };
        canvas.addEventListener("webglcontextlost", onContextLost);
        canvas.addEventListener("webglcontextrestored", onContextRestored);

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
            pointerType: event.pointerType || "touch",
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
          setHoldScreenFromPoint(x, y, event.pointerType || "touch");
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
          if (diag) {
            const size = collectMapEnvironment(containerRef.current ?? container);
            logMapDiag("init:map-load", {
              containerWidth: size.containerWidth,
              containerHeight: size.containerHeight,
              canvasWidth: canvas.width,
              canvasHeight: canvas.height,
              clientWidth: canvas.clientWidth,
              clientHeight: canvas.clientHeight,
            });
          }
          // Globe must wait until style load — early setProjection throws and
          // blocks World mode ("Style is not done loading").
          if (initialProjection === "globe") {
            try {
              map.setProjection({ type: "globe" });
            } catch (error) {
              console.warn("Could not enable globe projection", error);
              logMapDiag("init:globe-projection-failed", describeUnknownError(error));
            }
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
          if (diag) {
            const afterResize = collectMapEnvironment(
              containerRef.current ?? container,
            );
            logMapDiag("init:after-first-resize", {
              containerWidth: afterResize.containerWidth,
              containerHeight: afterResize.containerHeight,
              canvasWidth: canvas.width,
              canvasHeight: canvas.height,
            });
          }
          setMapReady(true);
        });

        // Keep the hold ring anchored while the map pans/zooms.
        map.on("move", () => {
          const hold = holdRef.current;
          if (hold) {
            projectHold(hold.lng, hold.lat, hold.pointerType);
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
          canvas.removeEventListener("webglcontextlost", onContextLost);
          canvas.removeEventListener("webglcontextrestored", onContextRestored);
          window.removeEventListener("pointermove", onPointerMove);
          window.removeEventListener("pointerup", onPointerUp);
          window.removeEventListener("pointercancel", onPointerUp);
          canvas.removeEventListener("contextmenu", onContextMenu);
        };
      } catch (error) {
        logMapDiag("init:failed", describeUnknownError(error));
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

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const width = entry?.contentRect.width ?? container.clientWidth;
      const height = entry?.contentRect.height ?? container.clientHeight;
      if (width < 2 || height < 2) {
        logMapDiag("resize:skip-zero-size", { width, height });
        return;
      }
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
    if (showLabels) {
      setIdentifyingLabelsVisible(map, true);
      return;
    }
    if (gameMode) {
      setMapLabelPreset(map, mapLabels);
    } else {
      setIdentifyingLabelsVisible(map, true);
    }
  }, [mapReady, showLabels, mapLabels, gameMode]);

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
        <>
          {/* Exact commit point under the finger. */}
          <div
            className="fg-hold-target pointer-events-none absolute z-10"
            style={{
              left: holdScreen.x,
              top: holdScreen.y,
            }}
            aria-hidden="true"
          />
          {/* Progress ring centred on the pin — larger on touch so the arc clears the thumb. */}
          <div
            className="pointer-events-none absolute z-10"
            style={{
              left: holdScreen.x,
              top: holdScreen.y,
              width: holdScreen.ringSize,
              height: holdScreen.ringSize,
              transform: "translate(-50%, -50%)",
            }}
          >
            <HoldProgressRing
              progress={holdVisual.progress}
              pulsing={holdVisual.pulsing}
              size={holdScreen.ringSize}
            />
          </div>
        </>
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
      <MapDiagCopyButton />
      {children}
    </div>
  );
}
