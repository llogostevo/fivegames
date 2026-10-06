import type { GameMode } from "@/lib/game/modes";
import type { ThemeId } from "@/lib/game/themes";
import type { MapLabelPreset } from "@/lib/map/style";
import type { Coordinates } from "@/types/coordinates";

export type GameAnswer = {
  name: string;
  lat: number;
  lng: number;
};

/** Optional reveal-only detail (e.g. Football stadium / city). Never sent mid-game. */
export type GameAnswerDetail = {
  stadium?: string;
  city?: string;
  division?: string;
  clubId?: string;
};

/** Full server-side game definition. Never send wholesale to the client. */
export type GameDefinition = {
  id: string;
  date: string;
  gameNumber: number;
  theme: ThemeId;
  /** Defaults to daily when omitted (legacy daily JSON). */
  mode?: GameMode;
  answer: GameAnswer;
  /** Football (and future modes) extras for completed reveals only. */
  answerDetail?: GameAnswerDetail;
  /**
   * Optional mid-game label describing the target type
   * (e.g. "Filming location", "Actor birthplace"). Safe to send publicly.
   */
  connectionLabel?: string;
  /**
   * Optional play-time map label preset. When omitted, derived from the mode.
   */
  mapLabels?: MapLabelPreset;
  clues: string[];
};

export type Guess = Coordinates;

export type TemperatureResult = "warmer" | "colder" | "same";

export type GuessEvaluation = {
  temperature: TemperatureResult | null;
};

/**
 * One actual committed pin in the player's journey.
 * Distances are only present on completed reveals — not mid-game.
 * Pins do not each contribute points; only the final pin scores.
 */
export type RevealedGuess = Guess & {
  distanceMeters: number;
  temperature: TemperatureResult | null;
  /** True for the pin used as the final answer / FOUND pin. */
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
    stadium?: string;
    city?: string;
    division?: string;
    /**
     * Stable dataset place id when available (club/pub/station/…).
     * Used for Found/Bagged collection — never show as a spoiler mid-game.
     */
    placeId?: string;
  };
  /** Which PIN5 mode produced this reveal. */
  mode: GameMode;
  /**
   * Actual committed pins only (journey history).
   * Final score is NOT the sum of these pins.
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
  /** Single final daily score (clue maximum × accuracy). */
  totalScore: number;
  /** Absolute daily maximum (Clue 1 ceiling = 25,000). */
  maxScore: number;
  /** Maximum available for the clue the player finished on. */
  clueMaximum: number;
  /** Accuracy factor in [0, 1] for the final pin. */
  accuracyFactor: number;
  /** Rounded metres from final pin to target. */
  finalDistanceMeters: number;
  /**
   * True when completion was an automatic FOUND (pin within the found radius).
   * Always server-derived — never accepted from the client.
   */
  foundLocation: boolean;
  /** Pin number that found the location, or null for Finish Here. */
  foundOnPin: number | null;
};

/**
 * Response from POST /api/game/check (commit pin).
 * Unsuccessful pins never include distance, score, or warmer/colder.
 */
export type CheckPinResponse =
  | {
      found: false;
      complete: false;
      awaitingDecision: true;
      guessIndex: number;
    }
  | {
      found: false;
      complete: true;
      reveal: GameReveal;
    }
  | {
      found: true;
      complete: true;
      reveal: GameReveal;
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
  mode: GameMode;
  themeId: ThemeId;
  /** Display name for the theme chip. */
  theme: string;
  accent: string;
  accentSoft: string;
  /** ISO timestamp of the next configured daily release. */
  nextReleaseAt: string;
  /**
   * Optional target-type label (e.g. "Filming location"). Present for modes
   * with mixed connection types; omitted/null otherwise.
   */
  connectionLabel?: string | null;
  /**
   * Which identifying label groups stay visible during play.
   * On reveal the client shows all identifying labels.
   */
  mapLabels: MapLabelPreset;
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
  /**
   * Warmer/colder for the just-committed pin vs the previous one.
   * Null after pin 1 (no previous pin). Only returned on Get Another Clue.
   */
  temperature: TemperatureResult | null;
};

export type LockAnswerResponse = {
  complete: true;
  reveal: GameReveal;
};
