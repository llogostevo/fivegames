/**
 * Human labels for per-location connection types (Harry Potter, Taylor Swift).
 * Safe mid-game — describes target type, not the answer.
 */

const CONNECTION_LABELS: Record<string, string> = {
  // Harry Potter / Wizarding World
  filming: "Filming location",
  studio: "Studio",
  "theme-park": "Theme park",
  premiere: "Premiere venue",
  exhibition: "Exhibition",
  literary: "Literary place",
  "actor-birthplace": "Actor birthplace",
  "franchise-landmark": "Franchise landmark",
  // Marvel (shared + franchise-specific)
  "in-universe": "Story location",
  publishing: "Publishing place",
  // Taylor Swift
  tour: "Tour venue",
  performance: "Performance",
  "music-video": "Music video location",
  song: "Song connection",
  career: "Career place",
  recording: "Recording location",
  "award-event": "Award event",
  other: "Career place",
};

/** Map a dataset connection slug to a short UI label, or null if unknown/empty. */
export function formatConnectionLabel(
  connection: string | null | undefined,
): string | null {
  if (!connection || typeof connection !== "string") {
    return null;
  }
  const key = connection.trim().toLowerCase();
  if (!key) {
    return null;
  }
  if (CONNECTION_LABELS[key]) {
    return CONNECTION_LABELS[key]!;
  }
  // Fallback: title-case hyphenated slug
  return key
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
