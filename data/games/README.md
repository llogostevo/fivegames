# Pin5 daily game data

Each file is one calendar day's challenge:

```text
YYYY-MM-DD.json
```

## Beta content — 4 UK weeks

The files dated **2026-09-28 → 2026-10-25** are temporary **UK-based** editorial samples for beta testing (28 games / 4 theme weeks). They are not final production content.

| Week | Dates | Themes |
|------|-------|--------|
| 1 | 28 Sep – 4 Oct | Music → Wildcard (#1–7) |
| 2 | 5–11 Oct | Music → Wildcard (#8–14) |
| 3 | 12–18 Oct | Music → Wildcard (#15–21) |
| 4 | 19–25 Oct | Music → Wildcard (#22–28) |

Weekday themes follow `src/lib/game/themes.ts` (Mon Music … Sun Wildcard).

Game JSON must stay under `data/games/` — never under `public/`.
