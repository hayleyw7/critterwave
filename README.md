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
- Pick any roster emoji as your hero, name them, and choose a **card color**
- **Light and dark themes** — footer toggle (persists in this browser); tuned contrast for HUD, battle log, damage pops, and footer stats; browser and PWA install chrome follow the active theme
- **Heal** (1–**7** HP at Lv 1, **+1** max per level) on your turn — main way to recover HP; foe may counterattack; does not build HYPE
- **Dance** for random foe reactions — HYPE for you and/or the foe when the line grants it, or neither (max **5 HYPE** each; **+1 ATK per HYPE**)
- Taking damage drops **1 HYPE** (yours or theirs when they get hit)
- **Partial heal after each wave victory** — regain **30%** of missing max HP (rounded up); sparkle + floating heal number when you actually gained HP; wave 1 start and beating all 100 waves still fully top you up
- Shuffled foe order each run
- **Scores persist** in this browser (high score, runs played)
- **Combat hints** on early fights — see [Combat hints](#combat-hints) below
- **Mid-run save** — refresh and your fight continues (with a “restored” message)
- Retro **CRT scanlines** — subtle in both light and dark mode

## Controls

| Action | Button | Notes |
|--------|--------|--------|
| Attack | ⚔️ | Foe may counterattack; counter damage drops 1 HYPE |
| Heal | 💚 | Random **1–heal max** (up to **7** at Lv 1, +1/level); foe may counterattack; does not build HYPE |
| Dance | 🕺 | Random reactions; HYPE for you and/or foe when granted; +1 ATK per HYPE |
| Run | 🏃 | Flee this foe — same heal roll as **Heal**, same wave, next foe, lose all HYPE; **not on wave 100** |

## Combat hints

Hints teach the four actions during your first run (each dismisses after you use that action once).

| When | What you see |
|------|----------------|
| **Setup** | Subtitle under “Which critter are you?” — *Defeat all 100 waves to win!* |
| **First fight** | **Attack** gets a pulsing yellow **outline** until your first strike (no popup) |
| **Low HP** (~60% or below) | **Heal** outline + tooltip: *Restore HP — foe will hit back.* |
| **After a wasted heal** (or wave 12+ at full HP with 0 hype) | **Dance** outline + tooltip: *Dance may add HYPE — makes hits stronger, for you and/or the foe.* |
| **Lethal HP** (foe’s hit would KO you) | **Run** outline + tooltip: *Run away — heal a little, face the next foe, and lose all HYPE.* |

Highlighted buttons use an **outline pulse only** — button colors stay the same. Hint state is saved with your run.

## Footer

| Element | What it does |
|---------|----------------|
| **High Score** | Highest wave you’ve reached this browser (updates on game over or full win). |
| **Runs Played** | How many runs you’ve finished (game over or victory). |
| **Light / Dark** | Switches palette (including foe card accents), `theme-color`, and PWA manifest; persists in this browser. |
| **New Run** | New hero and fresh run. High score and runs played are kept. Confirm dialog restores if you refresh mid-prompt. |
| **Clear Data** | Deletes your critter and all saved history on this browser. Confirm dialog restores if you refresh mid-prompt. |

## What gets saved

Stored under `critterwave-v6` in the browser:

- **High score** — highest wave number you’ve reached (updates when you die or beat all 100 waves)
- **Runs played** — how many runs you’ve finished (game over or full win)
- **Light / dark** — `colorMode` for the footer theme toggle
- **Hero** — emoji, name, and card color from your last run
- **Active run** — HP, your hype and foe hype, current foe, wave, turn, combat-hint progress, shuffled foe order, and any open **New Run** / **Clear Data** confirm (until game over or victory)

## Project layout

```
index.html              # assembled entry page (generated — see below)
html/
  index.template.html   # shell + partial placeholders
  partials/             # setup, combat, app chrome, game-over, …
css/
  styles.css            # hub that @imports module CSS files
  *.css                 # tokens, base, setup, presentation, combat, …
assets/theme-boot.js    # applies saved light/dark before first paint
src/
  game.ts               # thin entry — imports game/app init
  game/
    app.ts              # boot, setup, footer, confirm wiring
    combat.ts           # turn actions, foe queue advances
    presentation.ts     # render, animations, battle log, teach popups
    persistence.ts      # snapshots, confirm dialog, page-exit flush
    save-io.ts          # localStorage read/write (no DOM)
    colors.ts           # hero/foe card color themes
    hero-setup.ts       # setup name/color helpers
    …                   # constants, data, dom, state, types, stats, foe-queue
  lib/                  # pure rules, combat hints, save validation
  data/                 # foe roster
  content/              # dance lines
  ui/                   # victory celebration
js/                     # compiled output (npm run build — gitignored)
dist/                   # Pages deploy artifact (npm run build:site — gitignored)
scripts/
  build-html.mjs        # html/partials → index.html
  split-css.mjs         # regen css modules from styles.css.bak oracle
  build-site.mjs        # copy deployable files → dist/
  generate-foes.mjs     # regenerate src/data/foes-data.ts
icons/                  # favicons & PWA icons
images/                 # og-image.png (social preview)
tests/                  # Vitest unit tests (mirrors module names)
e2e/                    # Playwright browser tests
.github/workflows/      # deploy + CI
```

### Editing HTML or CSS

- **HTML:** edit files under `html/partials/`, then run `npm run build:html` (also runs on `npm run dev` via `predev`). `tests/html/build.test.ts` checks output against `scripts/index.html.bak`.
- **CSS:** edit module files under `css/`, or regen from the monolith backup with `node scripts/split-css.mjs`. `tests/css/build.test.ts` checks hub imports and keyframe coverage.
- **TypeScript:** edit `src/**/*.ts`, then `npm run build`. Game logic lives in `src/lib/`; DOM wiring and flows live in `src/game/` (`save-io` for storage, `colors` / `hero-setup` for theme and setup helpers).

## Local play

```bash
npm install
npm run build
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tests

```bash
npm test              # unit tests (Vitest) — game logic, combat hints, save validation, …
npm run test:watch    # unit tests in watch mode
npm run test:e2e      # browser tests (Playwright) — combat hints, happy/sad paths, security
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
