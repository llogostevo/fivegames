import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  COLLECTION_STORAGE_KEY,
  buildCollectionView,
  collectionOutcomeFromReveal,
  formatCollectionCountsCompact,
  formatCollectionCountsLine,
  formatCollectionDate,
  formatCollectionDistance,
  formatCollectionScore,
  getCollectionCounts,
  getTodayCollectionHighlight,
  listActivityForModes,
  listCollectionPlaces,
  parseCollectionState,
  placeIdFromReveal,
  recordCollectionFromReveal,
  shouldReplaceCollectionRecord,
  upsertCollectionPlace,
  type CollectionState,
} from "./collection";
import { PLAYER_HISTORY_VERSION, type PlayerHistory } from "./playerHistory";
import type { GameReveal } from "@/types/game";

function memoryStorage(initial: string | null = null) {
  const map = new Map<string, string>();
  if (initial) {
    map.set(COLLECTION_STORAGE_KEY, initial);
  }
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    dump: () => map.get(COLLECTION_STORAGE_KEY) ?? null,
  };
}

function reveal(partial: Partial<GameReveal> & Pick<GameReveal, "foundLocation" | "foundOnPin">): GameReveal {
  return {
    gameId: "2026-10-06",
    gameNumber: 9,
    date: "2026-10-06",
    mode: "football",
    themeId: "history",
    theme: "History",
    accent: "#000",
    accentSoft: "#eee",
    nextReleaseAt: "2026-10-07T07:00:00.000Z",
    answer: {
      name: "Wrexham",
      coordinates: { lat: 53.05, lng: -3.0 },
      placeId: "wrexham",
    },
    guesses: [],
    lockedAfterClue: 1,
    cluesUsed: 1,
    complete: true,
    finalCoordinates: { lat: 53.05, lng: -3.0 },
    actualGuessCount: 1,
    totalScore: 25_000,
    maxScore: 25_000,
    clueMaximum: 25_000,
    accuracyFactor: 1,
    finalDistanceMeters: 5,
    ...partial,
  };
}

describe("collection outcome", () => {
  it("bags on found pin 1, finds on later pins, none otherwise", () => {
    assert.equal(
      collectionOutcomeFromReveal({ foundLocation: true, foundOnPin: 1 }),
      "bagged",
    );
    assert.equal(
      collectionOutcomeFromReveal({ foundLocation: true, foundOnPin: 3 }),
      "found",
    );
    assert.equal(
      collectionOutcomeFromReveal({ foundLocation: false, foundOnPin: null }),
      "none",
    );
  });

  it("uses placeId from reveal or slugs the name", () => {
    assert.equal(
      placeIdFromReveal(
        reveal({ foundLocation: true, foundOnPin: 1 }),
      ),
      "wrexham",
    );
    assert.equal(
      placeIdFromReveal(
        reveal({
          foundLocation: true,
          foundOnPin: 1,
          answer: {
            name: "The Spaniards Inn",
            coordinates: { lat: 1, lng: 2 },
          },
        }),
      ),
      "the-spaniards-inn",
    );
  });
});

describe("collection upgrade rules", () => {
  it("upgrades found to bagged but never downgrades", () => {
    assert.equal(
      shouldReplaceCollectionRecord(
        { status: "found", date: "2026-10-01", name: "A" },
        { status: "bagged", date: "2026-10-06", name: "A" },
      ),
      true,
    );
    assert.equal(
      shouldReplaceCollectionRecord(
        { status: "bagged", date: "2026-10-01", name: "A" },
        { status: "found", date: "2026-10-06", name: "A" },
      ),
      false,
    );
    assert.equal(
      shouldReplaceCollectionRecord(
        { status: "found", date: "2026-10-01", name: "A" },
        { status: "found", date: "2026-10-06", name: "A" },
      ),
      false,
    );
  });
});

describe("collection storage", () => {
  it("records bagged and found idempotently", () => {
    const storage = memoryStorage();
    const bagged = reveal({ foundLocation: true, foundOnPin: 1 });
    assert.equal(recordCollectionFromReveal(bagged, storage), "bagged");
    assert.equal(recordCollectionFromReveal(bagged, storage), "bagged");

    const counts = getCollectionCounts("football", parseCollectionState(JSON.parse(storage.dump()!)));
    assert.equal(counts.found, 1);
    assert.equal(counts.bagged, 1);
    assert.equal(counts.total, 92);

    // Miss records nothing.
    assert.equal(
      recordCollectionFromReveal(
        reveal({
          foundLocation: false,
          foundOnPin: null,
          answer: {
            name: "Arsenal",
            coordinates: { lat: 1, lng: 2 },
            placeId: "arsenal",
          },
        }),
        storage,
      ),
      "none",
    );
    assert.equal(
      getCollectionCounts(
        "football",
        parseCollectionState(JSON.parse(storage.dump()!)),
      ).found,
      1,
    );
  });

  it("upgrades found to bagged across days", () => {
    let state: CollectionState = {};
    state = upsertCollectionPlace(state, "london-pubs", "the-spaniards-inn", {
      status: "found",
      date: "2026-10-01",
      name: "The Spaniards Inn",
    });
    state = upsertCollectionPlace(state, "london-pubs", "the-spaniards-inn", {
      status: "bagged",
      date: "2026-10-06",
      name: "The Spaniards Inn",
    });
    assert.equal(state["london-pubs"]!["the-spaniards-inn"]!.status, "bagged");
    assert.equal(state["london-pubs"]!["the-spaniards-inn"]!.date, "2026-10-06");

    state = upsertCollectionPlace(state, "london-pubs", "the-spaniards-inn", {
      status: "found",
      date: "2026-11-01",
      name: "The Spaniards Inn",
    });
    assert.equal(state["london-pubs"]!["the-spaniards-inn"]!.status, "bagged");
  });

  it("lists most recent first and formats counts", () => {
    const state: CollectionState = {
      football: {
        arsenal: { status: "found", date: "2026-10-01", name: "Arsenal" },
        wrexham: { status: "bagged", date: "2026-10-06", name: "Wrexham" },
      },
    };
    const listed = listCollectionPlaces("football", state);
    assert.equal(listed[0]!.placeId, "wrexham");
    assert.equal(listed[1]!.placeId, "arsenal");
    const counts = getCollectionCounts("football", state);
    assert.equal(
      formatCollectionCountsLine(counts),
      "2 found · 1 bagged · of 92",
    );
    assert.equal(
      formatCollectionCountsCompact(counts),
      "2 found · 1 bagged of 92",
    );
  });

  it("formats friendly collection dates", () => {
    assert.equal(formatCollectionDate("2026-10-25"), "Sun 25 Oct");
  });

  it("builds started vs not-started view with football grouped", () => {
    const state: CollectionState = {
      football: {
        wrexham: { status: "bagged", date: "2026-10-06", name: "Wrexham" },
      },
      marvel: {
        "disney-hq": {
          status: "found",
          date: "2026-10-05",
          name: "Disney HQ",
        },
      },
    };
    const view = buildCollectionView(state, {});
    assert.equal(view.started.length, 2);
    assert.equal(view.started[0]!.kind, "football");
    assert.equal(view.started[1]!.kind, "single");
    if (view.started[1]!.kind === "single") {
      assert.equal(view.started[1].mode, "marvel");
    }
    const football = view.started[0]!;
    if (football.kind === "football") {
      assert.equal(football.leagues.length, 5);
      assert.equal(football.counts.found, 1);
      assert.ok(football.leagues.some((league) => league.counts.found === 0));
    }
    assert.ok(view.notStarted.length > 0);
    assert.ok(view.notStarted.every((group) => group.counts.found === 0));
    assert.ok(!view.notStarted.some((group) => group.kind === "football"));
  });

  it("merges scores and played-not-found activity without leaking names", () => {
    const state: CollectionState = {
      football: {
        wrexham: { status: "bagged", date: "2026-10-06", name: "Wrexham" },
      },
    };
    const historyByMode: Partial<Record<"football", PlayerHistory>> = {
      football: {
        version: PLAYER_HISTORY_VERSION,
        games: {
          "2026-10-06": {
            gameId: "2026-10-06",
            gameNumber: 9,
            date: "2026-10-06",
            theme: "football",
            score: 25_000,
            lockedAfterClue: 1,
            completedAt: "2026-10-06T12:00:00.000Z",
            foundLocation: true,
            foundOnPin: 1,
            finalDistanceMeters: 8,
          },
          "2026-10-05": {
            gameId: "2026-10-05",
            gameNumber: 8,
            date: "2026-10-05",
            theme: "football",
            score: 12_400,
            lockedAfterClue: 4,
            completedAt: "2026-10-05T12:00:00.000Z",
            foundLocation: false,
            foundOnPin: null,
            finalDistanceMeters: 4200,
          },
        },
      },
    };
    const activity = listActivityForModes(
      ["football"],
      state,
      historyByMode,
    );
    assert.equal(activity.length, 2);
    assert.equal(activity[0]!.kind, "bagged");
    if (activity[0]!.kind === "bagged") {
      assert.equal(activity[0].score, 25_000);
      assert.equal(activity[0].distanceMeters, 8);
      assert.equal(activity[0].name, "Wrexham");
    }
    assert.equal(activity[1]!.kind, "played");
    if (activity[1]!.kind === "played") {
      assert.equal(activity[1].score, 12_400);
      assert.equal(activity[1].distanceMeters, 4200);
    }
    assert.equal(formatCollectionScore(12_400), "12,400 pts");
    assert.equal(formatCollectionDistance(8), "8 m");
    assert.equal(formatCollectionDistance(4200), "4.2 km");

    const view = buildCollectionView(
      {},
      {
        marvel: historyByMode.football,
      },
    );
    // Marvel has play history but no finds → still in Your games.
    assert.ok(
      view.started.some(
        (group) => group.kind === "single" && group.mode === "marvel",
      ),
    );
  });

  it("prefers bagged for today's highlight", () => {
    const state: CollectionState = {
      marvel: {
        a: { status: "found", date: "2026-10-06", name: "Found Place" },
      },
      football: {
        b: { status: "bagged", date: "2026-10-06", name: "Bagged Place" },
      },
    };
    const highlight = getTodayCollectionHighlight("2026-10-06", state);
    assert.ok(highlight);
    assert.equal(highlight!.status, "bagged");
    assert.equal(highlight!.name, "Bagged Place");
  });

  it("treats invalid storage as empty", () => {
    assert.deepEqual(parseCollectionState(null), {});
    assert.deepEqual(parseCollectionState({ football: "nope" }), {});
    const storage = memoryStorage("not-json");
    assert.deepEqual(
      getCollectionCounts("football", parseCollectionState(null)).found,
      0,
    );
    assert.equal(recordCollectionFromReveal(
      reveal({ foundLocation: false, foundOnPin: null }),
      storage,
    ), "none");
  });
});
