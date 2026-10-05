import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CLUE_MAX_SCORES,
  COUNTRY_SCORING_PROFILE,
  SCORING,
  WORLD_SCORING_PROFILE,
  accuracyFactorFromDistanceKm,
  calculateFinalScore,
  getClueMaxScore,
  getNextClueMaxScore,
  maxScoreForProfile,
} from "./scoring";

const SAMPLE_DISTANCES_KM = [
  0, 0.5, 1, 2, 5, 10, 25, 50, 100, 250, 500, 1_000, 5_000,
] as const;

describe("CLUE_MAX_SCORES", () => {
  it("defines the five clue ceilings", () => {
    assert.deepEqual([...CLUE_MAX_SCORES], [25_000, 22_500, 20_000, 17_500, 15_000]);
    assert.equal(getClueMaxScore(1), 25_000);
    assert.equal(getClueMaxScore(5), 15_000);
    assert.equal(getNextClueMaxScore(1), 22_500);
    assert.equal(getNextClueMaxScore(5), null);
    assert.equal(SCORING.MAX_TOTAL_POINTS, 25_000);
  });

  it("never allows a result above its clue maximum or 25,000", () => {
    for (let clue = 1; clue <= 5; clue += 1) {
      const max = getClueMaxScore(clue);
      const perfect = calculateFinalScore({ clueNumber: clue, distanceMeters: 0 });
      assert.equal(perfect.totalScore, max);
      assert.ok(perfect.totalScore <= 25_000);
      assert.ok(perfect.totalScore <= max);
    }
  });
});

describe("accuracyFactorFromDistanceKm", () => {
  it("is 100% at or inside the 1km FOUND radius", () => {
    assert.equal(accuracyFactorFromDistanceKm(0), 1);
    assert.equal(accuracyFactorFromDistanceKm(0.5), 1);
    assert.equal(accuracyFactorFromDistanceKm(1), 1);
  });

  it("matches the product curve targets approximately", () => {
    const table = SAMPLE_DISTANCES_KM.map((distanceKm) => ({
      distanceKm,
      percent: Math.round(accuracyFactorFromDistanceKm(distanceKm) * 10_000) / 100,
    }));

    assert.deepEqual(table, [
      { distanceKm: 0, percent: 100 },
      { distanceKm: 0.5, percent: 100 },
      { distanceKm: 1, percent: 100 },
      { distanceKm: 2, percent: 98.02 },
      { distanceKm: 5, percent: 95.12 },
      { distanceKm: 10, percent: 90.48 },
      { distanceKm: 25, percent: 77.88 },
      { distanceKm: 50, percent: 60.65 },
      { distanceKm: 100, percent: 36.79 },
      { distanceKm: 250, percent: 8.21 },
      { distanceKm: 500, percent: 0.67 },
      { distanceKm: 1_000, percent: 0 },
      { distanceKm: 5_000, percent: 0 },
    ]);
  });

  it("never increases as distance increases", () => {
    let previous = accuracyFactorFromDistanceKm(SAMPLE_DISTANCES_KM[0]);
    for (const distanceKm of SAMPLE_DISTANCES_KM.slice(1)) {
      const next = accuracyFactorFromDistanceKm(distanceKm);
      assert.ok(next <= previous + 1e-12);
      previous = next;
    }
  });
});

describe("calculateFinalScore", () => {
  it("FOUND / 100% accuracy awards the full clue maximum", () => {
    assert.equal(
      calculateFinalScore({ clueNumber: 1, distanceMeters: 999 }).totalScore,
      25_000,
    );
    assert.equal(
      calculateFinalScore({ clueNumber: 2, distanceMeters: 500 }).totalScore,
      22_500,
    );
    assert.equal(
      calculateFinalScore({ clueNumber: 3, distanceMeters: 1_000 }).totalScore,
      20_000,
    );
    assert.equal(
      calculateFinalScore({ clueNumber: 4, distanceMeters: 0 }).totalScore,
      17_500,
    );
    assert.equal(
      calculateFinalScore({ clueNumber: 5, distanceMeters: 250 }).totalScore,
      15_000,
    );
  });

  it("applies accuracy against the current clue maximum only", () => {
    // ~90% at 10km
    const clue1 = calculateFinalScore({ clueNumber: 1, distanceMeters: 10_000 });
    assert.equal(clue1.totalScore, 22_621);
    assert.equal(clue1.clueMaximum, 25_000);

    const clue3 = calculateFinalScore({ clueNumber: 3, distanceMeters: 10_000 });
    assert.equal(clue3.totalScore, 18_097);
    assert.equal(clue3.clueMaximum, 20_000);

    // ~60% at 50km
    const clue2 = calculateFinalScore({ clueNumber: 2, distanceMeters: 50_000 });
    assert.equal(clue2.totalScore, 13_647);
  });

  it("returns integer scores clamped to the clue ceiling", () => {
    for (const distanceKm of SAMPLE_DISTANCES_KM) {
      for (let clue = 1; clue <= 5; clue += 1) {
        const result = calculateFinalScore({
          clueNumber: clue,
          distanceMeters: distanceKm * 1000,
        });
        assert.ok(Number.isInteger(result.totalScore));
        assert.ok(result.totalScore >= 0);
        assert.ok(result.totalScore <= result.clueMaximum);
        assert.ok(result.totalScore <= 25_000);
      }
    }
  });

  it("only Clue 1 can produce 25,000", () => {
    for (let clue = 2; clue <= 5; clue += 1) {
      const result = calculateFinalScore({
        clueNumber: clue,
        distanceMeters: 0,
      });
      assert.ok(result.totalScore < 25_000);
      assert.equal(result.totalScore, getClueMaxScore(clue));
    }
  });
});

describe("WORLD_SCORING_PROFILE", () => {
  it("keeps the same clue ceilings as country games", () => {
    assert.deepEqual(
      [...WORLD_SCORING_PROFILE.clueMaxScores],
      [...COUNTRY_SCORING_PROFILE.clueMaxScores],
    );
    assert.equal(
      maxScoreForProfile(WORLD_SCORING_PROFILE),
      maxScoreForProfile(COUNTRY_SCORING_PROFILE),
    );
  });

  it("still awards points for multi-thousand kilometre misses", () => {
    const countryFar = calculateFinalScore({
      clueNumber: 1,
      distanceMeters: 1_000_000, // 1000 km
      profile: COUNTRY_SCORING_PROFILE,
    });
    const worldFar = calculateFinalScore({
      clueNumber: 1,
      distanceMeters: 1_000_000,
      profile: WORLD_SCORING_PROFILE,
    });

    assert.ok(countryFar.totalScore <= 1);
    assert.ok(worldFar.totalScore > 10_000);
    assert.ok(worldFar.totalScore < 25_000);
    assert.ok(worldFar.totalScore > countryFar.totalScore * 100);
  });

  it("still collapses antipodal-scale misses toward zero", () => {
    const antipode = calculateFinalScore({
      clueNumber: 1,
      distanceMeters: 15_000_000, // 15,000 km
      profile: WORLD_SCORING_PROFILE,
    });
    assert.ok(antipode.totalScore < 1_500);
  });
});
