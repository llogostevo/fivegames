import type { Coordinates } from "@/types/coordinates";
import type { ThemeId } from "@/lib/game/themes";

export type GameAnswer = {
  name: string;
  lat: number;
  lng: number;
};

/** Full server-side game definition loaded from dated JSON. Never send wholesale to the client. */
export type GameDefinition = {
  id: string;
  date: string;
  gameNumber: number;
  theme: ThemeId;
  answer: GameAnswer;
  clues: string[];
};

export type Guess = Coordinates;

export type TemperatureResult = "warmer" | "colder" | "same";

export type GuessEvaluation = {
  temperature: TemperatureResult | null;
};

/**
 * One of the five scoring slots in the final results.
 * Carried-forward rows reuse the final locked pin for scoring only.
 */
export type RevealedGuess = Guess & {
  distanceMeters: number | null;
  score: number;
  temperature: TemperatureResult | null;
  /** True when this slot was not an actual player guess. */
  carriedForward: boolean;
  /** True for the clue where the player committed their final answer. */
  isFinalAnswer: boolean;
};

export type GameReveal = {
  /** Stable id (ISO date) for later persistence. */
  gameId: string;
  gameNumber: number;
  date: string;
  themeId: ThemeId;
  /** Display name for UI. */
  theme: string;
  accent: string;
  accentSoft: string;
  /** ISO timestamp of the next configured daily release. */
  nextReleaseAt: string;
  answer: {
    name: string;
    coordinates: Coordinates;
  };
  /**
   * Five scoring rows (actual guesses + carried-forward slots).
   * Does not invent fake map markers — use `actualGuessCount` / filter
   * `carriedForward` for the map.
   */
  guesses: RevealedGuess[];
  /** How many clues the player actually used (1–5). */
  lockedAfterClue: number;
  /** Alias of lockedAfterClue for weekly-progress consumers. */
  cluesUsed: number;
  /** Always true when a reveal is returned. */
  complete: true;
  /** Coordinates of the pin that was committed as the final answer. */
  finalCoordinates: Coordinates;
  /** Number of pins the player physically placed. */
  actualGuessCount: number;
  totalScore: number;
  maxScore: number;
};

/** Locked pin returned on resume — coordinates + earned temperature only. */
export type PublicLockedGuess = Guess & {
  temperature: TemperatureResult | null;
};

/**
 * Public game state from /start (new, resumed, or completed).
 * Never includes the answer mid-game; reveal only when complete.
 */
export type PublicGameState = {
  gameId: string;
  gameNumber: number;
  date: string;
  themeId: ThemeId;
  /** Display name for the theme chip. */
  theme: string;
  accent: string;
  accentSoft: string;
  /** ISO timestamp of the next configured daily release. */
  nextReleaseAt: string;
  clueCount: number;
  /** How this /start response was produced. */
  status: "new" | "resumed" | "completed";
  /** Clues revealed so far (never includes unrevealed future clues). */
  clues: string[];
  /** Locked pins with warmer/colder already earned (no distances/scores). */
  guesses: PublicLockedGuess[];
  revealedClueCount: number;
  /** Index of the current clue (0-based) for display. */
  clueIndex: number;
  /** Current clue text, or null when complete. */
  clue: string | null;
  /** True when a guess is locked and Continue / Lock Final Answer is pending. */
  awaitingDecision: boolean;
  canLockAnswer: boolean;
  lockedAfterClue: number | null;
  complete: boolean;
  reveal: GameReveal | null;
};

export type LockGuessResponse = {
  guessIndex: number;
  temperature: TemperatureResult | null;
  complete: boolean;
  /** After clues 1–4, the player must continue or lock their answer. */
  awaitingDecision: boolean;
  canLockAnswer: boolean;
  reveal: GameReveal | null;
};

export type ContinueResponse = {
  clueIndex: number;
  clue: string;
};

export type LockAnswerResponse = {
  complete: true;
  reveal: GameReveal;
};
