import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PIN5_WEEK_ONE_START } from "./shareConfig";
import {
  getPin5WeekNumber,
  getWeekDates,
  getWeekStart,
  getWeekdayIndex,
  isSunday,
  isWeeklyShareAvailable,
} from "./week";

describe("week helpers", () => {
  it("starts weeks on Monday", () => {
    assert.equal(getWeekStart("2026-10-05"), "2026-10-05"); // Mon
    assert.equal(getWeekStart("2026-10-07"), "2026-10-05"); // Wed
    assert.equal(getWeekStart("2026-10-11"), "2026-10-05"); // Sun
  });

  it("returns Mon–Sun dates", () => {
    assert.deepEqual(getWeekDates("2026-10-08"), [
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
      "2026-10-10",
      "2026-10-11",
    ]);
  });

  it("handles Sunday → Monday boundary", () => {
    assert.equal(getWeekStart("2026-10-11"), "2026-10-05");
    assert.equal(getWeekStart("2026-10-12"), "2026-10-12");
  });

  it("handles a GMT winter week", () => {
    // 2026-11-02 is a Monday in London calendar terms.
    assert.equal(getWeekStart("2026-11-04"), "2026-11-02");
    assert.equal(getWeekdayIndex("2026-11-02"), 1);
  });

  it("handles a BST autumn week", () => {
    assert.equal(getWeekStart("2026-10-25"), "2026-10-19"); // Sun → prior Mon
  });
});

describe("PIN5 week numbers", () => {
  it("uses the configured Monday as Week 1", () => {
    assert.equal(PIN5_WEEK_ONE_START, "2026-09-28");
    assert.equal(getWeekdayIndex(PIN5_WEEK_ONE_START), 1);
    assert.equal(getPin5WeekNumber("2026-09-28"), 1);
    assert.equal(getPin5WeekNumber("2026-10-04"), 1); // Sunday of week 1
  });

  it("increments on the next Monday after Sunday", () => {
    assert.equal(getPin5WeekNumber("2026-10-04"), 1); // Sun
    assert.equal(getPin5WeekNumber("2026-10-05"), 2); // Mon
    assert.equal(getPin5WeekNumber("2026-10-11"), 2); // Sun
  });

  it("is not the ISO calendar week number", () => {
    // ISO week for 2026-09-28 would be week 40 — PIN5 uses sequential Week 1.
    assert.equal(getPin5WeekNumber("2026-09-28"), 1);
    assert.notEqual(getPin5WeekNumber("2026-09-28"), 40);
  });
});

describe("weekly share gate", () => {
  it("is Sunday-only", () => {
    assert.equal(isSunday("2026-10-04"), true);
    assert.equal(isWeeklyShareAvailable("2026-10-04"), true);
    assert.equal(isWeeklyShareAvailable("2026-10-05"), false);
  });
});
