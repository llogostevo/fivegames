import type { Coordinates } from "@/types/coordinates";

export type GameAnswer = {
  name: string;
  lat: number;
  lng: number;
};

export type GameDefinition = {
  id: string;
  theme: string;
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
  /** Coordinates of the pin that was committed as the final answer. */
  finalCoordinates: Coordinates;
  /** Number of pins the player physically placed. */
  actualGuessCount: number;
  totalScore: number;
  maxScore: number;
};

/** Public game state returned to the client (never includes the answer mid-game). */
export type PublicGameState = {
  gameId: string;
  theme: string;
  clueCount: number;
  clueIndex: number;
  clue: string | null;
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
