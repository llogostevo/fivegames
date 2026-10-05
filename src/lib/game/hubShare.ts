/**
 * Hub "share today's results" copy when every mode is complete.
 */

import {
  HUB_GAMES,
  type HubGameEntry,
} from "@/lib/game/hubCatalog";
import type { GameMode } from "@/lib/game/modes";
import { shareUrlForMode } from "@/lib/site";

export type HubShareScore = {
  mode: GameMode;
  score: number;
};

/** Multi-mode summary for the hub all-done share button. */
export function buildHubDayShareText(
  scores: readonly HubShareScore[],
  availableGameDate: string,
): string {
  const byMode = new Map(scores.map((row) => [row.mode, row.score]));
  const lines = [`PIN5 — ${availableGameDate}`, ""];

  for (const game of HUB_GAMES) {
    const score = byMode.get(game.id);
    if (typeof score !== "number") {
      continue;
    }
    lines.push(
      `${game.code} ${game.name}  ${score.toLocaleString("en-GB")} pts`,
    );
  }

  lines.push("", shareUrlForMode("world"));
  return lines.join("\n");
}

export function hubTileAriaLabel(
  game: HubGameEntry,
  played: boolean,
  score: number | null,
): string {
  const modeBit = `${game.name}, ${game.groupLabel}`;
  if (played && score !== null) {
    return `${modeBit} — played, ${score.toLocaleString("en-GB")} points`;
  }
  return `${modeBit} — not played yet`;
}
