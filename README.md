# Critterwave

A tiny browser RPG: pick a critter hero, fight alliterative foes, heal, dance, and beat every wave.

Play online after you enable [GitHub Pages](#github-pages) (Settings → Pages → **GitHub Actions**).

## Features

- Turn-based combat in the browser
- 115 hand-picked alliterative foes (critters and fantasy creatures)
- Pick any roster emoji as your hero
- Random dance reactions and hype buffs
- Shuffled foe order each run — defeat them all to win
- **Scores persist** in `localStorage` (best wave, run count)
- **Mid-run save** — refresh the page and your current fight continues

## Local play

```bash
npm install
npm run build
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tests

```bash
npm test              # unit tests (Vitest): alliteration, roster, dance, game logic
npm run test:watch    # unit tests in watch mode
npm run test:e2e      # browser tests (downloads Chromium if needed, then runs)
```

`npm run test:e2e` runs `playwright install chromium` automatically first. To install browsers manually: `npx playwright install chromium`.

## GitHub Pages

1. Push this repo to GitHub.
2. **Settings → Pages → Build and deployment → Source:** choose **GitHub Actions**.
3. Push to `main` (or `master`). The workflow builds TypeScript and deploys the site.

Your game will be at `https://<username>.github.io/<repo-name>/`.

## Controls

| Action | Button |
|--------|--------|
| Attack | ⚔️ |
| Heal (+3 HP) | 💚 |
| Dance | 🕺 |
| Run (skip to next wave) | 🏃 |

## What gets saved

Stored under `critterwave-v1` in the browser (migrates from older `goblinwave-*` keys):

- **Records:** best wave reached, number of runs played, chosen hero
- **Active run:** player HP, hype buff, current foe, wave, turn, and shuffled foe order (until game over)
