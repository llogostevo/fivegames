/** Expected number of clues / locked guesses. */
export const CLUE_COUNT = 5;

/**
 * If the change in distance to the target is within this many metres,
 * treat the guess as "same" rather than warmer/colder.
 */
export const DISTANCE_EQUALITY_TOLERANCE_METERS = 100;

export const GAME_SESSION_COOKIE = "fivegames_session";

/**
 * Persist across refresh and browser restarts for the daily window.
 * Long enough to finish a game overnight; superseded when the next
 * released game starts a new signed session.
 */
export const GAME_SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 48;

/** Development-only cookie used by the temporary date switcher toolbar. */
export const DEV_DATE_COOKIE = "fivegames_dev_date";
