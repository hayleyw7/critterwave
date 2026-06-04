# Critterwave

Choose your critter. Dance for foes. Survive **100 waves**.

A tiny browser RPG: pick a critter hero, fight alliterative foes, heal, dance, and beat the campaign.

**Play online:** [https://hayleyw7.github.io/critterwave/](https://hayleyw7.github.io/critterwave/)

Deploy or update hosting via [GitHub Pages](#github-pages) (Settings → Pages → **GitHub Actions**).

## Features

- Turn-based combat in the browser — no install
- **100 waves** to win; **117** hand-picked alliterative foes (critters and fantasy creatures)
- **Levels 1–10** — classic RPG pacing: stay Lv 1 for waves 1–10, level up at **11, 21, 31…**; HP, ATK, and max heal grow with you
- Foe **LV** varies around yours — easier critters fight below your level, tougher ones above (same rules from wave 1)
- Pick any roster emoji as your hero
- **Heal** (1–5 HP at Lv 1, grows with level) on your turn — foe may counterattack
- **Dance** for random foe reactions — hype for you, hype for them, both, or neither (max **5 HYPE** each; +1 ATK per level)
- **Full HP restore after each wave victory** — sparkle + floating heal number when you had missing HP
- Shuffled foe order each run
- **Scores persist** in this browser (high score, runs played)
- **Combat hints** — action buttons glow on early fights to teach Attack, Heal, Dance, and Run
- **Mid-run save** — refresh and your fight continues (with a “restored” message; wave counter flashes briefly)

## Controls

| Action | Button | Notes |
|--------|--------|--------|
| Attack | ⚔️ | |
| Heal | 💚 | 1–max HP (random); foe may counterattack; max heal grows with your level |
| Dance | 🕺 | Random reactions; +1 HYPE (max 5) for you, them, or both |
| Run | 🏃 | Skip to the next wave — **not on wave 100** |

## Footer

| Element | What it does |
|---------|----------------|
| **High Score** | Highest wave you’ve reached this browser (updates on game over or full win). |
| **Runs Played** | How many runs you’ve finished (game over or victory). |
| **New Run** | New hero and fresh run. High score and runs played are kept. |
| **Clear Data** | Deletes your critter and all saved history on this browser. |

## What gets saved

Stored under `critterwave-v1` in the browser (migrates from older `goblinwave-*` keys):

- **High score** — highest wave number you’ve reached (updates when you die or beat all 100 waves)
- **Runs played** — how many runs you’ve finished (game over or full win)
- **Hero** — emoji and name from your last run
- **Active run** — HP, your hype & foe hype, current foe, wave, turn, and shuffled foe order (until game over or victory)

## Project layout

```
index.html          # entry page
site.webmanifest
src/                # TypeScript source
  game.ts           # main game
  lib/              # rules, alliteration, hero picker order
  data/             # foe roster
  content/          # dance lines
  ui/               # victory celebration
js/                 # compiled output (npm run build — gitignored)
dist/               # Pages deploy artifact (npm run build:site — gitignored)
css/styles.css
icons/              # favicons & PWA icons
images/             # og-image.png (social preview)
assets/goblins/     # legacy placeholder art
scripts/            # generate-foes, generate:og
tests/              # Vitest unit tests
e2e/                # Playwright browser tests
.github/workflows/  # deploy + CI
```

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

This project uses **plain TypeScript** (`tsc`) — no bundler. `npm run build` compiles `src/**/*.ts` → `js/`; the browser loads `js/game.js` from `index.html`.

Hosting is automated by [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

### One-time setup on GitHub

1. Push the repo to GitHub (e.g. `hayleyw7/critterwave`).
2. Open the repo on GitHub → **Settings** → **Pages**.
3. Under **Build and deployment → Source**, choose **GitHub Actions** (not “Deploy from a branch”).
4. Push to `main` (or run the **Deploy to GitHub Pages** workflow manually under **Actions**).

The workflow runs `npm ci`, `npm run build:site`, then publishes the `dist/` folder (a slim copy of the site for Pages).

### Your live URL

For a project repo named `critterwave`:

**https://hayleyw7.github.io/critterwave/**

(Replace username/repo if yours differ.)

### Local check before you push

```bash
npm install
npm run build      # src/ → js/ (local dev)
npm run dev        # http://localhost:3000
npm run build:site # optional: same as CI — builds js/ then copies to dist/
```

### What *not* to do (common bad advice)

- **No Vite/Webpack required** — `tsc` is enough for this app.
- **No `gh-pages` branch** — the Actions workflow deploys for you.
- **Don’t deploy the repo root to Pages** — local dev serves from the root (`js/` at repo root); CI publishes `dist/` from `build:site`.

After the first successful deploy, link previews may need absolute image URLs (`og:image`) — use your full Pages URL + `/images/og-image.png` if Discord/iMessage show a broken preview.
