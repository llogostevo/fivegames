# FiveGames daily game data

Each file is one calendar day's challenge:

```text
YYYY-MM-DD.json
```

## Development / test week

The seven files dated **2026-09-28 → 2026-10-04** are **temporary development games**.

They exist so we can exercise the daily loader, weekly themes, and gameplay. They are **not** final editorial content.

| Date       | Weekday   | Theme        | # |
|------------|-----------|--------------|---|
| 2026-09-28 | Monday    | Music        | 1 |
| 2026-09-29 | Tuesday   | Movies & TV  | 2 |
| 2026-09-30 | Wednesday | Sport        | 3 |
| 2026-10-01 | Thursday  | History      | 4 |
| 2026-10-02 | Friday    | World        | 5 |
| 2026-10-03 | Saturday  | Culture      | 6 |
| 2026-10-04 | Sunday    | Wildcard     | 7 |

To force a specific day during local development, set `FIVEGAMES_DEV_DATE` (see repo `.env.example`).

Game JSON must stay under `data/games/` — never under `public/`.
