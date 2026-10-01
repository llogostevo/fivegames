import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { afterEach, describe, it } from "node:test";

import {
  createEmptySession,
  decodeSession,
  DEV_SESSION_SECRET_FALLBACK,
  encodeSession,
  getSessionSecret,
  SessionSecretConfigError,
} from "./session";

const ORIGINAL_SECRET = process.env.FIVEGAMES_SESSION_SECRET;

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) {
    delete process.env.FIVEGAMES_SESSION_SECRET;
  } else {
    process.env.FIVEGAMES_SESSION_SECRET = ORIGINAL_SECRET;
  }
});

describe("getSessionSecret", () => {
  it("allows the documented development fallback", () => {
    delete process.env.FIVEGAMES_SESSION_SECRET;
    assert.equal(
      getSessionSecret({ nodeEnv: "development" }),
      DEV_SESSION_SECRET_FALLBACK,
    );
  });

  it("fails closed in production when the secret is missing", () => {
    delete process.env.FIVEGAMES_SESSION_SECRET;
    assert.throws(
      () => getSessionSecret({ nodeEnv: "production" }),
      SessionSecretConfigError,
    );
  });

  it("rejects the known development secret in production", () => {
    process.env.FIVEGAMES_SESSION_SECRET = DEV_SESSION_SECRET_FALLBACK;
    assert.throws(
      () => getSessionSecret({ nodeEnv: "production" }),
      SessionSecretConfigError,
    );
  });

  it("rejects short production secrets", () => {
    process.env.FIVEGAMES_SESSION_SECRET = "too-short-for-production";
    assert.throws(
      () => getSessionSecret({ nodeEnv: "production" }),
      SessionSecretConfigError,
    );
  });

  it("accepts a strong production secret", () => {
    process.env.FIVEGAMES_SESSION_SECRET =
      "unit-test-production-secret-value-32chars-min";
    assert.equal(
      getSessionSecret({ nodeEnv: "production" }),
      "unit-test-production-secret-value-32chars-min",
    );
  });
});

describe("session signing", () => {
  it("round-trips a valid session", () => {
    delete process.env.FIVEGAMES_SESSION_SECRET;
    const session = createEmptySession("2026-10-01");
    const token = encodeSession(session);
    const decoded = decodeSession(token);
    assert.deepEqual(decoded, session);
  });

  it("rejects a tampered signed session", () => {
    delete process.env.FIVEGAMES_SESSION_SECRET;
    const token = encodeSession(createEmptySession("2026-10-01"));
    const [payload, signature] = token.split(".");
    const flipped = payload!.slice(0, -1) + (payload!.endsWith("A") ? "B" : "A");
    assert.equal(decodeSession(`${flipped}.${signature}`), null);
  });

  it("rejects sessions missing startedAt", () => {
    delete process.env.FIVEGAMES_SESSION_SECRET;
    const payload = Buffer.from(
      JSON.stringify({
        gameId: "2026-10-01",
        guesses: [],
        revealedClueCount: 1,
        lockedAfterClue: null,
      }),
      "utf8",
    ).toString("base64url");
    const signature = createHmac("sha256", DEV_SESSION_SECRET_FALLBACK)
      .update(payload)
      .digest("base64url");
    assert.equal(decodeSession(`${payload}.${signature}`), null);
  });

  it("rejects impossible progression state", () => {
    delete process.env.FIVEGAMES_SESSION_SECRET;
    const payload = Buffer.from(
      JSON.stringify({
        gameId: "2026-10-01",
        guesses: [
          { lat: 1, lng: 1 },
          { lat: 2, lng: 2 },
        ],
        revealedClueCount: 1,
        lockedAfterClue: null,
        startedAt: new Date().toISOString(),
      }),
      "utf8",
    ).toString("base64url");
    const signature = createHmac("sha256", DEV_SESSION_SECRET_FALLBACK)
      .update(payload)
      .digest("base64url");
    assert.equal(decodeSession(`${payload}.${signature}`), null);
  });
});
