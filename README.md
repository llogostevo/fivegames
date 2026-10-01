# Pin5

Pin5 is a daily browser-based location quiz. Each calendar day has one challenge: five progressive clues, five map pins, warmer/colder feedback, and a maximum score of 25,000.

## Tech stack

- [Next.js](https://nextjs.org/) (App Router)
- TypeScript
- Tailwind CSS
- MapLibre GL
- ESLint
- npm

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm test
npm run lint
npm run build
npm start
```

## Daily games

Games live as server-only JSON under `data/games/YYYY-MM-DD.json`.

A dated game becomes playable at **08:00 Europe/London** on its date (not midnight). Before that time, the previous day's game remains the available challenge. GMT/BST are handled via the `Europe/London` timezone.

Release schedule is configured in `src/lib/game/dailyConfig.ts` (`DAILY_GAME_CONFIG`). Change `releaseHour` / `releaseMinute` there to move the daily drop; countdown copy updates automatically.

### Weekly themes

| Day       | Theme       | Accent   |
|-----------|-------------|----------|
| Monday    | Music       | Magenta  |
| Tuesday   | Movies & TV | Purple   |
| Wednesday | Sport       | Green    |
| Thursday  | History     | Amber    |
| Friday    | World       | Blue     |
| Saturday  | Culture     | Coral    |
| Sunday    | Wildcard    | Teal     |

Theme ids, labels, and accent colours are defined in `src/lib/game/themes.ts`. Game JSON only stores the theme id.

### Beta date switcher

A temporary amber **Dev date** dropdown sits above the site in all environments (including production) so testers can pick any of the seven sample games. It uses a cookie and should be removed when beta testing ends.

Optional server-wide pins still work if set: `FIVEGAMES_DEV_DATE` / `FIVEGAMES_DEV_NOW` (see `.env.example`).

Temporary test games covering Mon–Sun are documented in `data/games/README.md`. They are **not** final editorial content.

### Missing games

If no JSON exists for the currently released date, the API returns 404. Production shows a simple “isn’t available yet” message; development returns a clearer missing-file hint.

## Security notes

- Game JSON (including answers) is never placed under `public/`
- Before completion the client only receives the current clue and public meta (id, number, date, theme label)
- Answer name, coordinates, future clues, distances, and scores stay server-side until the reveal
