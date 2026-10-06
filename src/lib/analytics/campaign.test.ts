import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_CAMPAIGN_REF,
  FRIEND_SHARE_REF,
  readCampaignRefFromSearch,
  sanitiseCampaignRef,
} from "./campaign";
import { scoreBandFromTotal } from "./track";
import {
  MAX_DAYS_PLAYED_TRACKED,
  VISITOR_STORAGE_KEY,
  isReturningBrowser,
  parseVisitorState,
  touchVisitorState,
} from "./visitor";

describe("campaign ref", () => {
  it("accepts safe lowercase refs", () => {
    assert.equal(sanitiseCampaignRef("Lloyd-WhatsApp"), "lloyd-whatsapp");
    assert.equal(sanitiseCampaignRef("friend-share"), FRIEND_SHARE_REF);
    assert.equal(sanitiseCampaignRef("school_1"), "school_1");
  });

  it("rejects unsafe or empty values", () => {
    assert.equal(sanitiseCampaignRef(""), null);
    assert.equal(sanitiseCampaignRef("??"), null);
    assert.equal(sanitiseCampaignRef("a/b"), null);
    assert.equal(sanitiseCampaignRef("x".repeat(50)), null);
    assert.equal(sanitiseCampaignRef(null), null);
  });

  it("reads ref from a query string", () => {
    assert.equal(
      readCampaignRefFromSearch("?ref=lloyd-whatsapp&utm=1"),
      "lloyd-whatsapp",
    );
    assert.equal(readCampaignRefFromSearch("?utm=1"), null);
  });
});

describe("scoreBandFromTotal", () => {
  it("buckets scores for low-cardinality events", () => {
    assert.equal(scoreBandFromTotal(0), "0-4999");
    assert.equal(scoreBandFromTotal(12_000), "10000-14999");
    assert.equal(scoreBandFromTotal(25_000), "25000");
  });
});

describe("visitor state", () => {
  it("parses valid stored state", () => {
    const parsed = parseVisitorState({
      firstVisit: "2026-10-06",
      lastVisit: "2026-10-07",
      daysPlayed: ["2026-10-06", "2026-10-07"],
      gamesStarted: 2,
      gamesCompleted: 1,
      firstRef: "lloyd-whatsapp",
    });
    assert.ok(parsed);
    assert.equal(parsed.firstRef, "lloyd-whatsapp");
    assert.equal(isReturningBrowser(parsed), true);
  });

  it("treats first-day visitors as not returning", () => {
    assert.equal(
      isReturningBrowser({
        firstVisit: "2026-10-06",
        lastVisit: "2026-10-06",
        daysPlayed: ["2026-10-06"],
        gamesStarted: 1,
        gamesCompleted: 0,
        firstRef: DEFAULT_CAMPAIGN_REF,
      }),
      false,
    );
  });

  it("keeps first attribution sticky in localStorage", () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
    };
    const previousWindow = (globalThis as { window?: unknown }).window;
    Object.defineProperty(globalThis, "window", {
      value: { localStorage: storage },
      configurable: true,
    });

    try {
      const first = touchVisitorState({
        today: "2026-10-06",
        incomingRef: "lloyd-whatsapp",
      });
      assert.equal(first.firstRef, "lloyd-whatsapp");
      assert.equal(first.daysPlayed.length, 1);

      const second = touchVisitorState({
        today: "2026-10-07",
        incomingRef: "facebook",
      });
      assert.equal(second.firstRef, "lloyd-whatsapp");
      assert.deepEqual(second.daysPlayed, ["2026-10-06", "2026-10-07"]);
      assert.equal(isReturningBrowser(second), true);

      const raw = memory.get(VISITOR_STORAGE_KEY);
      assert.ok(raw);
      assert.ok(raw.includes("lloyd-whatsapp"));
      assert.ok(!raw.includes("facebook"));
      assert.ok(MAX_DAYS_PLAYED_TRACKED >= 30);
    } finally {
      if (previousWindow === undefined) {
        Reflect.deleteProperty(globalThis, "window");
      } else {
        Object.defineProperty(globalThis, "window", {
          value: previousWindow,
          configurable: true,
        });
      }
    }
  });
});
