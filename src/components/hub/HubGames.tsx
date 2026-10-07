"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { HubFlagIcon } from "@/components/hub/HubIcons";
import {
  emptyHubProgress,
  hubProgressForMode,
  readHubProgress,
  type HubProgressSnapshot,
} from "@/lib/game/hubProgress";
import {
  HUB_GAMES,
  HUB_SECTION_META,
  HUB_SECTION_ORDER,
  comingSoonForGroup,
  hubGamesInGroup,
  isHubGameEntry,
  pickFeaturedGame,
  withComingSoonPad,
  type HubComingSoonEntry,
  type HubGameEntry,
  type HubGameGroup,
} from "@/lib/game/hubCatalog";
import { hubTileAriaLabel, buildHubDayShareText } from "@/lib/game/hubShare";
import { formatCountdown } from "@/lib/game/date";
import { formatDailyReleaseBlurb } from "@/lib/game/dailyConfig";
import { GAME_MODES, type GameMode } from "@/lib/game/modes";
import {
  PLAYER_HISTORY_UPDATED_EVENT,
  historyStorageKey,
} from "@/lib/game/playerHistory";
import { shareText } from "@/lib/game/share";

const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c4157a]";

function useColumnCount(): number {
  const [columns, setColumns] = useState(2);

  useEffect(() => {
    const update = () => {
      const width = window.innerWidth;
      if (width >= 1100) {
        setColumns(4);
      } else if (width >= 768) {
        setColumns(3);
      } else {
        setColumns(2);
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return columns;
}

function hubStorageFingerprint(availableGameDate: string): string {
  if (typeof window === "undefined") {
    return `server:${availableGameDate}`;
  }
  const storagePart = GAME_MODES.map(
    (mode) =>
      `${mode}:${window.localStorage.getItem(historyStorageKey(mode)) ?? ""}`,
  ).join("|");
  return `${availableGameDate}::${storagePart}`;
}

const clientCache = new Map<string, HubProgressSnapshot>();
const serverCache = new Map<string, HubProgressSnapshot>();

function getHubProgressSnapshot(
  availableGameDate: string,
): HubProgressSnapshot {
  const fingerprint = hubStorageFingerprint(availableGameDate);
  const cached = clientCache.get(fingerprint);
  if (cached) {
    return cached;
  }
  const snapshot = readHubProgress(undefined, { availableGameDate });
  clientCache.set(fingerprint, snapshot);
  return snapshot;
}

function getServerHubProgressSnapshot(
  availableGameDate: string,
): HubProgressSnapshot {
  const cached = serverCache.get(availableGameDate);
  if (cached) {
    return cached;
  }
  const snapshot = emptyHubProgress(availableGameDate);
  serverCache.set(availableGameDate, snapshot);
  return snapshot;
}

function subscribeHubProgress(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const onChange = () => {
    clientCache.clear();
    onStoreChange();
  };
  window.addEventListener("storage", onChange);
  window.addEventListener("focus", onChange);
  window.addEventListener("visibilitychange", onChange);
  window.addEventListener(PLAYER_HISTORY_UPDATED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("focus", onChange);
    window.removeEventListener("visibilitychange", onChange);
    window.removeEventListener(PLAYER_HISTORY_UPDATED_EVENT, onChange);
  };
}

function SectionHeading({
  id,
  title,
  played,
  total,
}: {
  id: string;
  title: string;
  played: number;
  total: number;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2
        id={id}
        className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5f6368]"
      >
        {title}
      </h2>
      <p className="text-[11px] tabular-nums text-[#5f6368]">
        {played} of {total} played
      </p>
    </div>
  );
}

function ComingSoonTile({ entry }: { entry: HubComingSoonEntry }) {
  return (
    <div
      className="flex min-h-[150px] items-center justify-center rounded-[18px] border border-dashed border-[#dadcd8] bg-transparent px-4 text-center"
      aria-hidden="true"
    >
      <p className="text-sm leading-snug text-[#5f6368]">{entry.label}</p>
    </div>
  );
}

function GameTile({
  game,
  played,
  score,
}: {
  game: HubGameEntry;
  played: boolean;
  score: number | null;
}) {
  return (
    <Link
      href={game.href}
      aria-label={hubTileAriaLabel(game, played, score)}
      className={`group relative flex h-full min-h-[150px] flex-col overflow-hidden rounded-[18px] border border-[#dadcd8] motion-safe:transition motion-safe:duration-150 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md ${FOCUS_RING} ${
        played ? "bg-[#eef0ed]" : "bg-white"
      }`}
    >
      {/* Decorative map */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          backgroundImage: `url(${game.mapImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          opacity: played ? 0.45 : 0.85,
        }}
      />
      <div
        className={`pointer-events-none absolute inset-0 ${
          played
            ? "bg-gradient-to-t from-[#eef0ed] via-[#eef0ed]/70 to-[#eef0ed]/15"
            : "bg-gradient-to-t from-white via-white/65 to-white/10"
        }`}
        aria-hidden="true"
      />

      <div className="relative flex flex-1 flex-col p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dadcd8] bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#1d1d1f]">
            <HubFlagIcon code={game.code} className="h-3 w-4 shrink-0" />
            {game.code}
          </span>
          <span
            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#dadcd8] bg-white/95 text-[13px] leading-none"
            aria-hidden="true"
            title={game.groupLabel}
          >
            {game.tileEmoji}
          </span>
        </div>

        <div className="mt-auto min-w-0 pt-6">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5f6368]">
            {game.shortLabel}
          </p>
          <p className="font-display text-[1.65rem] font-bold leading-none tracking-tight text-[#1d1d1f]">
            {game.name}
          </p>
          {played && score !== null ? (
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-[#1d1d1f]">
              <span
                className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#1d1d1f] text-[10px] leading-none text-white"
                aria-hidden="true"
              >
                ✓
              </span>
              <span className="tabular-nums">
                {score.toLocaleString("en-GB")} pts
              </span>
            </p>
          ) : (
            <p className="mt-1.5 text-sm font-semibold text-[#c4157a]">
              Play →
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function FeaturedPlayTile({
  game,
  className = "",
}: {
  game: HubGameEntry;
  className?: string;
}) {
  return (
    <Link
      href={game.href}
      aria-label={`Today's featured game: ${hubTileAriaLabel(game, false, null)}`}
      className={`relative block min-h-[176px] overflow-hidden rounded-[20px] bg-[#1d1d1f] text-white motion-safe:transition motion-safe:duration-150 motion-safe:hover:brightness-110 ${FOCUS_RING} ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          backgroundImage: `url(${game.mapImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          filter: "brightness(0.62) contrast(1.08) saturate(0.85)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#1d1d1f]/82 via-[#1d1d1f]/35 to-transparent"
        aria-hidden="true"
      />

      <div className="relative flex h-full min-h-[176px] flex-col justify-center px-5 py-5 sm:px-6">
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/90">
            <HubFlagIcon code={game.code} className="h-3 w-4 shrink-0" />
            {game.code}
          </span>
          <span
            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/25 bg-white/10 text-[13px] leading-none"
            aria-hidden="true"
          >
            {game.tileEmoji}
          </span>
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75">
          Today&apos;s featured game
        </p>
        <p className="mt-2 font-display text-4xl font-bold leading-none tracking-tight sm:text-[2.75rem]">
          {game.name}
        </p>
        <p className="mt-1.5 text-sm text-white/80">{game.shortLabel}</p>
        <span className="mt-4 inline-flex w-fit items-center rounded-lg bg-[#c4157a] px-3.5 py-2 text-sm font-semibold text-white">
          Play today&apos;s place →
        </span>
      </div>
    </Link>
  );
}

function FeaturedAllDoneTile({
  nextReleaseAt,
  availableGameDate,
  snapshot,
}: {
  nextReleaseAt: string;
  availableGameDate: string;
  snapshot: HubProgressSnapshot;
}) {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const target = Date.parse(nextReleaseAt);
    if (Number.isNaN(target)) {
      return 0;
    }
    return Math.max(0, Math.ceil((target - Date.now()) / 1000));
  });
  const [shareStatus, setShareStatus] = useState<
    "idle" | "copied" | "shared"
  >("idle");

  useEffect(() => {
    const id = window.setInterval(() => {
      const target = Date.parse(nextReleaseAt);
      if (Number.isNaN(target)) {
        setSecondsLeft(0);
        return;
      }
      setSecondsLeft(Math.max(0, Math.ceil((target - Date.now()) / 1000)));
    }, 1000);
    return () => window.clearInterval(id);
  }, [nextReleaseAt]);

  async function handleShare() {
    const scores = HUB_GAMES.map((game) => {
      const row = hubProgressForMode(snapshot, game.id);
      return {
        mode: game.id,
        score: row?.todayScore ?? 0,
      };
    }).filter((row) => {
      const progress = hubProgressForMode(snapshot, row.mode);
      return progress?.playedToday;
    });

    const result = await shareText(
      buildHubDayShareText(scores, availableGameDate),
    );
    if (result.status === "copied" || result.status === "shared") {
      setShareStatus(result.status);
      window.setTimeout(() => setShareStatus("idle"), 2000);
    }
  }

  const shareLabel =
    shareStatus === "copied"
      ? "Copied!"
      : shareStatus === "shared"
        ? "Shared!"
        : "Share today's results";

  return (
    <div className="relative min-h-[176px] overflow-hidden rounded-[20px] bg-[#1d1d1f] px-5 py-5 text-white sm:px-6">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          backgroundImage: "url(/hub-maps/world.webp)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          filter: "brightness(0.62) contrast(1.08) saturate(0.85)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#1d1d1f]/82 via-[#1d1d1f]/35 to-transparent"
        aria-hidden="true"
      />
      <div className="relative">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75">
          Today&apos;s featured game
        </p>
        <p className="mt-2 font-display text-3xl font-bold leading-none tracking-tight sm:text-4xl">
          All done for today
        </p>
        {secondsLeft > 0 ? (
          <p className="mt-2 text-sm text-white/80">
            Next games in{" "}
            <span className="font-display text-lg font-bold tabular-nums text-white">
              {formatCountdown(secondsLeft)}
            </span>
            <span className="mt-0.5 block text-xs text-white/55">
              {formatDailyReleaseBlurb()}
            </span>
          </p>
        ) : (
          <p className="mt-2 text-sm text-white/80">New games are ready.</p>
        )}
        <button
          type="button"
          onClick={() => void handleShare()}
          className={`mt-4 inline-flex rounded-lg bg-[#c4157a] px-3.5 py-2 text-sm font-semibold text-white motion-safe:transition motion-safe:hover:brightness-110 ${FOCUS_RING}`}
        >
          {shareLabel}
        </button>
      </div>
    </div>
  );
}

function HubSection({
  group,
  snapshot,
  featuredId,
  columns,
}: {
  group: HubGameGroup;
  snapshot: HubProgressSnapshot;
  featuredId: GameMode | null;
  columns: number;
}) {
  const meta = HUB_SECTION_META[group];
  const allInGroup = hubGamesInGroup(group);
  const playedCount = allInGroup.filter(
    (game) => hubProgressForMode(snapshot, game.id)?.playedToday,
  ).length;

  const visible = allInGroup.filter((game) => game.id !== featuredId);
  const padded = withComingSoonPad(
    visible,
    columns,
    comingSoonForGroup(group),
  );

  const gridClass =
    columns >= 4
      ? "grid-cols-4"
      : columns >= 3
        ? "grid-cols-3"
        : "grid-cols-2";

  return (
    <section aria-labelledby={meta.id} className="space-y-2.5">
      <SectionHeading
        id={meta.id}
        title={meta.title}
        played={playedCount}
        total={allInGroup.length}
      />
      <div className={`grid gap-3 ${gridClass}`}>
        {padded.map((entry) => {
          if (!isHubGameEntry(entry)) {
            return <ComingSoonTile key={entry.id} entry={entry} />;
          }
          const progress = hubProgressForMode(snapshot, entry.id);
          return (
            <GameTile
              key={entry.id}
              game={entry}
              played={progress?.playedToday === true}
              score={progress?.todayScore ?? null}
            />
          );
        })}
      </div>
    </section>
  );
}

type HubGamesProps = {
  availableGameDate: string;
  nextReleaseAt: string;
};

export function HubGames({
  availableGameDate,
  nextReleaseAt,
}: HubGamesProps) {
  const router = useRouter();
  const snapshot = useSyncExternalStore(
    subscribeHubProgress,
    () => getHubProgressSnapshot(availableGameDate),
    () => getServerHubProgressSnapshot(availableGameDate),
  );
  const columns = useColumnCount();

  // At 6am London (nextReleaseAt), re-fetch the server date so tiles reset.
  useEffect(() => {
    const target = Date.parse(nextReleaseAt);
    if (Number.isNaN(target)) {
      return;
    }
    const delay = Math.max(0, target - Date.now() + 250);
    const id = window.setTimeout(() => {
      router.refresh();
    }, delay);
    return () => window.clearTimeout(id);
  }, [nextReleaseAt, router]);

  const playedSet = new Set<GameMode>(
    HUB_GAMES.filter(
      (game) => hubProgressForMode(snapshot, game.id)?.playedToday,
    ).map((game) => game.id),
  );
  const featured = pickFeaturedGame(playedSet);
  const featuredGroup = featured?.group ?? null;
  /** Desktop: fold featured + up to two companion tiles from the same section. */
  const companionTiles =
    featured !== null
      ? hubGamesInGroup(featured.group).filter((game) => game.id !== featured.id)
      : [];
  const foldFeaturedRow =
    columns >= 4 &&
    featured !== null &&
    companionTiles.length >= 1 &&
    companionTiles.length <= 2;

  return (
    <div className="space-y-5 sm:space-y-6">
      {foldFeaturedRow && featured ? (
        <div className="grid grid-cols-4 gap-3">
          <FeaturedPlayTile
            game={featured}
            className={`${companionTiles.length === 1 ? "col-span-3" : "col-span-2"} h-full`}
          />
          {companionTiles.map((game) => {
            const progress = hubProgressForMode(snapshot, game.id);
            return (
              <GameTile
                key={game.id}
                game={game}
                played={progress?.playedToday === true}
                score={progress?.todayScore ?? null}
              />
            );
          })}
        </div>
      ) : featured ? (
        <FeaturedPlayTile game={featured} />
      ) : (
        <FeaturedAllDoneTile
          nextReleaseAt={nextReleaseAt}
          availableGameDate={availableGameDate}
          snapshot={snapshot}
        />
      )}

      {HUB_SECTION_ORDER.map((group) => {
        if (foldFeaturedRow && group === featuredGroup) {
          return null;
        }
        return (
          <HubSection
            key={group}
            group={group}
            snapshot={snapshot}
            featuredId={featured?.id ?? null}
            columns={columns}
          />
        );
      })}

      <div className="pt-1">
        <Link
          href="/collection"
          className={`inline-flex items-center gap-1.5 text-sm font-semibold text-[#1d1d1f] underline decoration-[#c4157a]/40 underline-offset-4 transition hover:decoration-[#c4157a] ${FOCUS_RING} rounded-sm`}
        >
          Your collection
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
