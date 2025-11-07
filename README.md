# Damareen Card Game Companion

React + TypeScript single page application that implements the Damareen fantasy card game workflow for the DUSZA 2025/26 web-mobile qualifier. The app covers both Game Master tooling (world setup) and Player workflow (deck building, dungeon fights, rewards) according to the competition specification.

## Quick start

```bash
npm install
npm run dev
```

The development server runs on <http://localhost:5173>. The UI persists data in the browser local storage, so changes survive refreshes. Use a private window if you need a clean slate.

## Role overview

- **Game Master mode** - create and maintain game environments: world cards, derived leader cards, starter collections, and dungeon definitions. The editor enforces the published limits (unique names, stat ranges, unique standard cards per dungeon, required leader placement for minor/major dungeons).
- **Player mode** - start a new play session within any available environment, build ordered decks from the personal collection, run dungeon battles with a detailed combat log, and apply stat rewards when victorious. Decks must match the dungeon length before a fight can begin.

## Default content

The app ships with a ready-to-play environment named **Damareen Alapkor** featuring sample standard and leader cards plus three dungeons (encounter, minor, major). Game Masters can extend or replace this environment or create new ones from scratch.

## Combat rules implementation

- Damage greater than opponent health resolves the round immediately.
- Elemental advantage follows the specified cycle (fire > earth > water > air > fire). Elemental advantage only applies when the damage comparison does not decide the round.
- If damage and elements result in a stalemate, the dungeon card wins by rule.
- A battle counts as a victory only when every dungeon card is defeated, matching the brief requirement.
- Rewards are applied after victories: +1 damage (encounter), +2 health (minor), +3 damage (major). The player chooses the target card from the collection.

## Key screens

- **Environment sidebar** - manage available worlds, create new environments, or remove unused ones.
- **Game Master workspace** - forms for adding standard cards, deriving leader cards, managing starter collections, and assembling dungeon lineups with live validation.
- **Player hub** - start games, review collections, build ordered decks (with drag-up/down controls), trigger battles, review logs, and view historical fights.

## Visual polish

- Card previews now render element themed gradients and stats with lightweight hover motion for quick recognition.
- Battle reports animate round entries sequentially so the flow of each clash stays readable at a glance.
- Reward selection and deck building reuse the same interactive card tiles, keeping actions close to the context.

## Development scripts

```bash
npm run dev     # start Vite in watch mode
npm run build   # produce production bundle with type checking
npm run preview # preview the production bundle
```

## Known gaps and notes

- The battle resolver requires a perfect sweep to claim victory (matching the Hungarian brief literally). Adjust `runBattle` if a different win condition is preferred.
- Accessibility focuses on keyboardable controls and clear focus styles, but screen reader texts have not been audited.
- No backend integration is provided; persistence relies on browser storage.

## Future ideas

- Add analytics to compare deck performance across dungeons.
- Introduce multiplayer syncing via a backend so several players can share one environment online.
- Provide export/import of environments as JSON to simplify sharing between teams.

---

Let us know if extra quality-of-life features (search, filtering, desktop shortcuts) are required; the structure is ready for incremental enhancements.
