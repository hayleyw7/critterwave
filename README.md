# Goblinwave

A tiny browser RPG: fight goblins, heal, dance, and survive as many waves as you can.

Play online after you enable [GitHub Pages](#github-pages) (Settings → Pages → **GitHub Actions**).

## Features

- Turn-based combat in the browser
- 8 goblin moods with swappable art
- Random dance reactions
- Gold and wave scoring
- **Scores persist** in `localStorage` (best wave, best gold in a run, lifetime gold, run count)
- **Mid-run save** — refresh the page and your current fight continues

## Local play

```bash
npm install
npm run build
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## GitHub Pages

1. Push this repo to GitHub.
2. **Settings → Pages → Build and deployment → Source:** choose **GitHub Actions**.
3. Push to `main` (or `master`). The workflow builds TypeScript and deploys the site.

Your game will be at `https://<username>.github.io/<repo-name>/`.

## Goblin images (8 placeholders)

Replace the placeholder SVGs in `assets/goblins/` with your own art. Keep the same filenames, or use PNG/WebP and update `GOBLIN_IMAGES` in `game.ts`.

| File | When it shows |
|------|----------------|
| `goblin-default.svg` | Combat idle |
| `goblin-angry.svg` | Goblin attacks you |
| `goblin-happy.svg` | Positive dance reactions, gold toss |
| `goblin-confused.svg` | Confused / wary reactions |
| `goblin-impressed.svg` | Impressed / emotional reactions |
| `goblin-disappointed.svg` | Boos, tomatoes, game over |
| `goblin-silly.svg` | Funny dance outcomes |
| `goblin-dancing.svg` | Goblin joins your dance |

Suggested ChatGPT prompt: *"Pixel-art goblin RPG sprite, green skin, single character, transparent background, 200x200, mood: [happy/angry/etc.]"*

## Controls

| Action | Button |
|--------|--------|
| Attack | ⚔️ |
| Heal (+3 HP) | 💚 |
| Dance | 🕺 |
| Run (skip to next wave) | 🏃 |

## What gets saved

Stored under `goblinwave-v1` in the browser:

- **Records:** best wave reached, best gold in one run, total gold earned across all runs, number of runs
- **Active run:** player HP, gold, current goblin, wave, and turn (until game over)
