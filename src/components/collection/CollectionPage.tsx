"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import {
  COLLECTION_STORAGE_KEY,
  COLLECTION_UPDATED_EVENT,
  buildCollectionView,
  formatCollectionDate,
  getOverallCollectionCounts,
  getTodayCollectionHighlight,
  readCollectionState,
  type CollectionCounts,
  type CollectionPlaceRow,
  type CollectionState,
  type CollectionViewGroup,
} from "@/lib/game/collection";
import { getAvailableGameDate } from "@/lib/game/date";
import {
  GAME_MODE_DEFINITIONS,
  modePath,
  type GameMode,
} from "@/lib/game/modes";
import { buildCollectionModeShareText, shareText } from "@/lib/game/share";

const EMPTY_COLLECTION: CollectionState = {};
let cachedFingerprint: string | null = null;
let cachedSnapshot: CollectionState = EMPTY_COLLECTION;

const PLACE_LIST_PREVIEW = 10;
const PROGRESS_BAR_MAX_TOTAL = 200;
const PROGRESS_BAR_MIN_PX = 4;

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

function singleModeTitle(mode: GameMode): string {
  const def = GAME_MODE_DEFINITIONS[mode];
  return def.chipLabel || def.title;
}

function footballLeagueLabel(mode: GameMode): string {
  return GAME_MODE_DEFINITIONS[mode].subtitle;
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 3v10m0-10 3.5 3.5M12 3 8.5 6.5M6 11v7.5A2.5 2.5 0 0 0 8.5 21h7a2.5 2.5 0 0 0 2.5-2.5V11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProminentCounts({
  counts,
  onShare,
  shareLabel,
}: {
  counts: CollectionCounts;
  onShare?: () => void;
  shareLabel?: string;
}) {
  return (
    <div className="mt-3 flex items-end justify-between gap-3">
      <p className="font-display text-[1.65rem] font-bold leading-none tracking-tight">
        <span>{counts.found} found</span>
        <span className="text-foreground"> · </span>
        <span className="text-course">{counts.bagged} bagged</span>
        <span className="ml-1.5 align-baseline text-sm font-semibold text-muted">
          of {counts.total}
        </span>
      </p>
      {onShare && counts.found >= 1 ? (
        <button
          type="button"
          onClick={onShare}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-muted transition hover:text-foreground"
          aria-label={shareLabel ?? "Share my collection"}
        >
          <ShareIcon />
          {shareLabel === "Copied!" || shareLabel === "Shared!"
            ? shareLabel
            : "Share"}
        </button>
      ) : null}
    </div>
  );
}

function CollectionProgressBar({ counts }: { counts: CollectionCounts }) {
  if (counts.found < 1 || counts.total > PROGRESS_BAR_MAX_TOTAL) {
    return null;
  }

  const foundPct = Math.min(100, (counts.found / counts.total) * 100);
  const baggedPct = Math.min(100, (counts.bagged / counts.total) * 100);
  const foundWidth = `max(${PROGRESS_BAR_MIN_PX}px, ${foundPct}%)`;
  const baggedWidth =
    counts.bagged > 0
      ? `max(${PROGRESS_BAR_MIN_PX}px, ${baggedPct}%)`
      : "0px";

  return (
    <div
      className="mt-3 h-2.5 overflow-hidden rounded-full bg-neutral-200"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={counts.total}
      aria-valuenow={counts.found}
      aria-label={`${counts.found} of ${counts.total} found`}
    >
      <div className="relative h-full w-full">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-course/45"
          style={{ width: foundWidth }}
        />
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-course"
          style={{ width: baggedWidth }}
        />
      </div>
    </div>
  );
}

function PlaceList({ places }: { places: CollectionPlaceRow[] }) {
  const [expanded, setExpanded] = useState(false);
  const needsToggle = places.length > PLACE_LIST_PREVIEW;
  const visible =
    needsToggle && !expanded ? places.slice(0, PLACE_LIST_PREVIEW) : places;

  return (
    <div className="mt-3">
      <ul className="divide-y divide-rule/70">
        {visible.map((place) => {
          const bagged = place.status === "bagged";
          return (
            <li
              key={`${place.mode}:${place.placeId}`}
              className="flex items-baseline justify-between gap-3 py-2.5"
            >
              <div className="min-w-0">
                <p
                  className={`truncate text-sm ${
                    bagged ? "font-bold text-course" : "font-medium text-foreground"
                  }`}
                >
                  {place.name}
                </p>
                <p className="text-xs text-muted">
                  {formatCollectionDate(place.date)}
                </p>
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
      {needsToggle ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 text-sm font-semibold text-course transition hover:brightness-90"
        >
          {expanded
            ? "Show less"
            : `Show all (${places.length})`}
        </button>
      ) : null}
    </div>
  );
}

function useShareAction(mode: GameMode, counts: CollectionCounts) {
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
        : "Share";

  return { handleShare, shareLabel };
}

function StartedGameCard({ group }: { group: CollectionViewGroup }) {
  if (group.kind === "single") {
    return <StartedSingleCard group={group} />;
  }
  return <StartedFootballCard group={group} />;
}

function StartedSingleCard({
  group,
}: {
  group: Extract<CollectionViewGroup, { kind: "single" }>;
}) {
  const { handleShare, shareLabel } = useShareAction(group.mode, group.counts);

  return (
    <article className="rounded-2xl border border-rule bg-white px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-xl font-bold tracking-tight">
          {singleModeTitle(group.mode)}
        </h3>
        <Link
          href={modePath(group.mode)}
          className="shrink-0 text-sm font-semibold text-course transition hover:brightness-90"
        >
          Play
        </Link>
      </div>
      <ProminentCounts
        counts={group.counts}
        onShare={() => void handleShare()}
        shareLabel={shareLabel}
      />
      <CollectionProgressBar counts={group.counts} />
      <PlaceList places={group.places} />
    </article>
  );
}

function LeagueShareButton({
  mode,
  counts,
}: {
  mode: GameMode;
  counts: CollectionCounts;
}) {
  const { handleShare, shareLabel } = useShareAction(mode, counts);
  if (counts.found < 1) {
    return null;
  }
  return (
    <button
      type="button"
      onClick={() => void handleShare()}
      className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-muted transition hover:text-foreground"
      aria-label={`Share ${footballLeagueLabel(mode)} collection`}
    >
      <ShareIcon />
      {shareLabel === "Copied!" || shareLabel === "Shared!" ? shareLabel : null}
    </button>
  );
}

function StartedFootballCard({
  group,
}: {
  group: Extract<CollectionViewGroup, { kind: "football" }>;
}) {
  const primaryMode =
    group.leagues.find((league) => league.counts.found > 0)?.mode ??
    group.modes[0]!;

  return (
    <article className="rounded-2xl border border-rule bg-white px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-xl font-bold tracking-tight">
          Football
        </h3>
        <Link
          href={modePath(primaryMode)}
          className="shrink-0 text-sm font-semibold text-course transition hover:brightness-90"
        >
          Play
        </Link>
      </div>
      <ProminentCounts counts={group.counts} />
      <CollectionProgressBar counts={group.counts} />

      <ul className="mt-3 space-y-1.5">
        {group.leagues.map((league) => {
          const muted = league.counts.found === 0;
          return (
            <li
              key={league.mode}
              className={`flex items-baseline justify-between gap-2 rounded-lg px-2 py-1.5 ${
                muted ? "text-muted" : "text-foreground"
              }`}
            >
              <p className={`min-w-0 flex-1 text-sm ${muted ? "" : "font-medium"}`}>
                {footballLeagueLabel(league.mode)}
                <span className="text-muted">
                  {" "}
                  · {league.counts.found} found · {league.counts.bagged} bagged
                  · of {league.counts.total}
                </span>
              </p>
              <div className="flex shrink-0 items-center gap-2">
                <LeagueShareButton mode={league.mode} counts={league.counts} />
                <Link
                  href={modePath(league.mode)}
                  className={`text-sm font-semibold transition hover:brightness-90 ${
                    muted ? "text-muted" : "text-course"
                  }`}
                >
                  Play
                </Link>
              </div>
            </li>
          );
        })}
      </ul>

      <PlaceList places={group.places} />
    </article>
  );
}

function NotStartedRow({ group }: { group: CollectionViewGroup }) {
  if (group.kind === "football") {
    return (
      <li className="flex items-center justify-between gap-3 py-2.5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Football</p>
          <p className="text-xs text-muted">{group.counts.total} places</p>
        </div>
        <Link
          href={modePath("football")}
          className="shrink-0 text-sm font-semibold text-course transition hover:brightness-90"
        >
          Play
        </Link>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <div className="flex min-w-0 items-baseline gap-2">
        <p className="truncate text-sm font-medium text-foreground">
          {singleModeTitle(group.mode)}
        </p>
        <p className="shrink-0 text-xs text-muted">
          {group.counts.total} places
        </p>
      </div>
      <Link
        href={modePath(group.mode)}
        className="shrink-0 text-sm font-semibold text-course transition hover:brightness-90"
      >
        Play
      </Link>
    </li>
  );
}

export function CollectionPage() {
  const state = useSyncExternalStore(
    subscribeCollection,
    getClientCollectionSnapshot,
    getServerCollectionSnapshot,
  );
  const overall = getOverallCollectionCounts(state);
  const today = getAvailableGameDate(new Date());
  const todayHighlight = getTodayCollectionHighlight(today, state);
  const { started, notStarted } = buildCollectionView(state);

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
            <span>{overall.found} found</span>
            <span> · </span>
            <span className="font-semibold text-course">
              {overall.bagged} bagged
            </span>
            <span> across all games</span>
          </p>
          {todayHighlight ? (
            <p
              className={`mt-1.5 text-sm ${
                todayHighlight.status === "bagged"
                  ? "font-semibold text-course"
                  : "text-foreground"
              }`}
            >
              {todayHighlight.status === "bagged"
                ? `🎯 Bagged today: ${todayHighlight.name}`
                : `Found today: ${todayHighlight.name}`}
            </p>
          ) : null}
        </header>

        {started.length === 0 ? (
          <p className="mb-5 rounded-2xl border border-dashed border-rule bg-white/70 px-4 py-4 text-sm leading-relaxed text-[#5f6368]">
            Nothing collected yet. Find a place in any game to start your
            collection — get it on clue 1 to bag it.
          </p>
        ) : (
          <section aria-labelledby="your-games-heading" className="mb-6">
            <h2
              id="your-games-heading"
              className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted"
            >
              Your games
            </h2>
            <div className="space-y-4">
              {started.map((group) => (
                <StartedGameCard
                  key={group.kind === "football" ? "football" : group.mode}
                  group={group}
                />
              ))}
            </div>
          </section>
        )}

        {notStarted.length > 0 ? (
          <section aria-labelledby="not-started-heading">
            <h2
              id="not-started-heading"
              className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted"
            >
              Not started yet
            </h2>
            <ul className="rounded-2xl border border-rule bg-white px-4 divide-y divide-rule/70">
              {notStarted.map((group) => (
                <NotStartedRow
                  key={group.kind === "football" ? "football" : group.mode}
                  group={group}
                />
              ))}
            </ul>
          </section>
        ) : null}

        <p className="mt-8 text-center text-xs text-muted">
          Your collection is saved on this device only.
        </p>
      </div>
    </main>
  );
}
