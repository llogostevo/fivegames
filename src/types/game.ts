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

export type RevealedGuess = Guess & {
  distanceMeters: number;
};

export type GameReveal = {
  answer: {
    name: string;
    coordinates: Coordinates;
  };
  guesses: RevealedGuess[];
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
  nextClueIndex: number | null;
  nextClue: string | null;
  reveal: GameReveal | null;
};
