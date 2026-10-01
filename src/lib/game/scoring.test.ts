import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SCORING, calculateScore } from "./scoring";

const SAMPLE_DISTANCES_KM = [
  0, 0.1, 1, 5, 10, 25, 50, 100, 250, 500, 1_000, 2_500, 5_000, 10_000,
] as const;

describe("calculateScore", () => {
  it("returns 5000 for an effectively exact location", () => {
    assert.equal(calculateScore(0), SCORING.MAX_POINTS_PER_GUESS);
    assert.equal(
      calculateScore(SCORING.PERFECT_DISTANCE_KM),
      SCORING.MAX_POINTS_PER_GUESS,
    );
  });

  it("never returns below 0 or above 5000", () => {
    for (const distanceKm of [
      ...SAMPLE_DISTANCES_KM,
      -1,
      -100,
      Number.POSITIVE_INFINITY,
      Number.NaN,
    ]) {
      const score = calculateScore(distanceKm);
      assert.ok(Number.isInteger(score));
      assert.ok(score >= 0);
      assert.ok(score <= SCORING.MAX_POINTS_PER_GUESS);
    }
  });

  it("treats negative distance as a perfect score", () => {
    assert.equal(calculateScore(-1), SCORING.MAX_POINTS_PER_GUESS);
  });

  it("returns a sensible near-zero score for extremely large distances", () => {
    assert.equal(calculateScore(5_000), 0);
    assert.equal(calculateScore(10_000), 0);
  });

  it("never increases as distance increases", () => {
    let previous = calculateScore(SAMPLE_DISTANCES_KM[0]);
    for (const distanceKm of SAMPLE_DISTANCES_KM.slice(1)) {
      const score = calculateScore(distanceKm);
      assert.ok(
        score <= previous,
        `expected score(${distanceKm})=${score} <= previous=${previous}`,
      );
      previous = score;
    }
  });

  it("produces the expected sample table for play-testing", () => {
    const table = SAMPLE_DISTANCES_KM.map((distanceKm) => ({
      distanceKm,
      score: calculateScore(distanceKm),
    }));

    // Snapshot-style checks for the current decay curve (DECAY_LENGTH_KM=100).
    assert.deepEqual(table, [
      { distanceKm: 0, score: 5000 },
      { distanceKm: 0.1, score: 4995 },
      { distanceKm: 1, score: 4950 },
      { distanceKm: 5, score: 4756 },
      { distanceKm: 10, score: 4524 },
      { distanceKm: 25, score: 3894 },
      { distanceKm: 50, score: 3033 },
      { distanceKm: 100, score: 1839 },
      { distanceKm: 250, score: 410 },
      { distanceKm: 500, score: 34 },
      { distanceKm: 1_000, score: 0 },
      { distanceKm: 2_500, score: 0 },
      { distanceKm: 5_000, score: 0 },
      { distanceKm: 10_000, score: 0 },
    ]);
  });

  it("keeps max total at 25,000 for five perfect guesses", () => {
    const total = Array.from({ length: 5 }, () => calculateScore(0)).reduce(
      (sum, score) => sum + score,
      0,
    );
    assert.equal(total, SCORING.MAX_TOTAL_POINTS);
  });
});
