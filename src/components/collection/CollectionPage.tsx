"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import {
  COLLECTION_STORAGE_KEY,
  COLLECTION_UPDATED_EVENT,
  formatCollectionCountsLine,
  getCollectionCounts,
  listCollectionPlaces,
  readCollectionState,
  type CollectionCounts,
  type CollectionPlaceRecord,
  type CollectionState,
} from "@/lib/game/collection";
import {
  GAME_MODE_DEFINITIONS,
  listPlayableModes,
  modePath,
  type GameMode,
  type GameModeDefinition,
} from "@/lib/game/modes";
import { buildCollectionModeShareText, shareText } from "@/lib/game/share";

type ModePlaces = Array<CollectionPlaceRecord & { placeId: string }>;

function modeHeading(def: GameModeDefinition): string {
  if (def.family === "football") {
    return `Football · ${def.subtitle}`;
  }
  return def.chipLabel || def.title;
}

const EMPTY_COLLECTION: CollectionState = {};
let cachedFingerprint: string | null = null;
let cachedSnapshot: CollectionState = EMPTY_COLLECTION;

function collectionStorageFingerprint(): string {
  try {
    if (typeof window === "undefined") {
      return "server";
    }
    return window.localStorage.getItem(COLLECTION_STORAGE_KEY) ?? "";
  } catch {
    return "unavailable";
  }
}

function invalidateCollectionSnapshotCache(): void {
  cachedFingerprint = null;
}

function subscribeCollection(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const onChange = () => {
    invalidateCollectionSnapshotCache();
    onStoreChange();
  };
  window.addEventListener("storage", onChange);
  window.addEventListener(COLLECTION_UPDATED_EVENT, onChange);
  window.addEventListener("focus", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(COLLECTION_UPDATED_EVENT, onChange);
    window.removeEventListener("focus", onChange);
  };
}

function getClientCollectionSnapshot(): CollectionState {
  const fingerprint = collectionStorageFingerprint();
  if (cachedFingerprint === fingerprint) {
    return cachedSnapshot;
  }
  cachedFingerprint = fingerprint;
  cachedSnapshot = readCollectionState();
  return cachedSnapshot;
}

function getServerCollectionSnapshot(): CollectionState {
  return EMPTY_COLLECTION;
}

function CollectionProgressBar({ counts }: { counts: CollectionCounts }) {
  const foundPct =
    counts.total > 0 ? Math.min(100, (counts.found / counts.total) * 100) : 0;
  const baggedPct =
    counts.total > 0 ? Math.min(100, (counts.bagged / counts.total) * 100) : 0;

  return (
    <div
      className="mt-2 h-2.5 overflow-hidden rounded-full bg-neutral-200"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={counts.total}
      aria-valuenow={counts.found}
      aria-label={`${counts.found} of ${counts.total} found`}
    >
      <div className="relative h-full w-full">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-course/45"
          style={{ width: `${foundPct}%` }}
        />
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-course"
          style={{ width: `${baggedPct}%` }}
        />
      </div>
    </div>
  );
}

function ModeCollectionSection({
  mode,
  state,
}: {
  mode: GameMode;
  state: CollectionState;
}) {
  const def = GAME_MODE_DEFINITIONS[mode];
  const counts = getCollectionCounts(mode, state);
  const places: ModePlaces = listCollectionPlaces(mode, state);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "shared">(
    "idle",
  );

  async function handleShare() {
    const result = await shareText(buildCollectionModeShareText(mode, counts));
    if (result.status === "shared" || result.status === "copied") {
      setShareStatus(result.status);
    }
  }

  const shareLabel =
    shareStatus === "copied"
      ? "Copied!"
      : shareStatus === "shared"
        ? "Shared!"
        : "Share my collection";

  return (
    <section
      className="rounded-2xl border border-rule bg-white px-4 py-4"
      aria-labelledby={`collection-${mode}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            id={`collection-${mode}`}
            className="font-display text-xl font-bold tracking-tight"
          >
            {modeHeading(def)}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {formatCollectionCountsLine(counts)}
          </p>
        </div>
        <Link
          href={modePath(mode)}
          className="shrink-0 text-sm font-semibold text-course transition hover:brightness-90"
        >
          Play
        </Link>
      </div>

      <CollectionProgressBar counts={counts} />

      {places.length === 0 ? (
        <p className="mt-3 text-sm text-muted">
          Nothing found yet — play today&apos;s game to start your collection.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-rule/70">
          {places.map((place) => {
            const bagged = place.status === "bagged";
            return (
              <li
                key={place.placeId}
                className={`flex items-baseline justify-between gap-3 py-2.5 ${
                  bagged ? "text-course" : "text-foreground"
                }`}
              >
                <div className="min-w-0">
                  <p
                    className={`truncate text-sm ${
                      bagged ? "font-bold" : "font-medium"
                    }`}
                  >
                    {place.name}
                  </p>
                  <p className="text-xs text-muted">{place.date}</p>
                </div>
                <p
                  className={`shrink-0 text-xs font-semibold ${
                    bagged ? "text-course" : "text-muted"
                  }`}
                >
                  {bagged ? "🎯 Bagged" : "✓ Found"}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        onClick={() => void handleShare()}
        className="mt-3 w-full rounded-xl border border-rule bg-neutral-50 py-2.5 text-sm font-semibold transition hover:bg-neutral-100"
      >
        {shareLabel}
      </button>
    </section>
  );
}

export function CollectionPage() {
  const state = useSyncExternalStore(
    subscribeCollection,
    getClientCollectionSnapshot,
    getServerCollectionSnapshot,
  );
  const modes = listPlayableModes();

  return (
    <main className="relative flex min-h-dvh flex-1 flex-col bg-[#f3f4f1]">
      <div className="relative mx-auto flex w-full max-w-[640px] flex-1 flex-col px-4 pb-10 pt-8 sm:px-6">
        <header className="mb-6">
          <Link
            href="/"
            className="text-sm font-semibold text-course transition hover:brightness-90"
          >
            ← Pin5 home
          </Link>
          <h1 className="mt-3 font-display text-[2.1rem] font-bold leading-none tracking-tight text-[#1d1d1f]">
            Your collection
          </h1>
          <p className="mt-2 text-sm text-[#5f6368]">
            Places you Found or Bagged across Pin5 games.
          </p>
        </header>

        <div className="space-y-4">
          {modes.map((def) => (
            <ModeCollectionSection key={def.id} mode={def.id} state={state} />
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-muted">
          Your collection is saved on this device only.
        </p>
      </div>
    </main>
  );
}
