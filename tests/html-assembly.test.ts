import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** IDs referenced from src/game/dom.ts — assembly must preserve them. */
const REQUIRED_DOM_IDS = [
  "arena",
  "battle-stage",
  "player-panel",
  "foe-panel",
  "damage-layer",
  "hero-level-up-layer",
  "xp-bar",
  "xp-fill",
  "xp-text",
  "stat-best-wave",
  "stat-runs",
  "wave-banner",
  "player-hp-fill",
  "player-hp-text",
  "player-level",
  "player-attack",
  "player-buff",
  "player-hype-wrap",
  "player-hype-bar",
  "player-hype-fill",
  "hero-emoji",
  "hero-name",
  "foe-name",
  "foe-level",
  "foe-attack",
  "foe-buff",
  "foe-hype-wrap",
  "foe-hype-bar",
  "foe-hype-fill",
  "foe-emoji",
  "foe-hp-fill",
  "foe-hp-text",
  "turn-label",
  "battle-text",
  "actions",
  "cmd-heal",
  "cmd-dance",
  "cmd-attack",
  "cmd-heal-teach",
  "cmd-dance-teach",
  "cmd-run-teach",
  "cmd-run",
  "game-over",
  "victory-emoji-layer",
  "game-over-tag",
  "game-over-summary",
  "game-over-battle-log",
  "restart-btn",
  "quit-btn",
  "reset-stats-btn",
  "footer-more",
  "help-btn",
  "help-overlay",
  "help-panel",
  "help-close",
  "theme-toggle",
  "confirm-overlay",
  "confirm-panel",
  "confirm-title",
  "confirm-message",
  "confirm-ok",
  "confirm-cancel",
  "character-setup",
  "setup-subtitle",
  "hero-picker",
  "hero-name-input",
  "hero-color-swatches",
  "hero-color-toggle",
  "hero-color-popup",
  "setup-start-btn",
  "setup-hint",
  "teach-popup-dock",
] as const;

describe("HTML assembly", () => {
  it("preserves dom bindings referenced by the game", () => {
    const html = readFileSync(join(root, "index.html"), "utf8");
    for (const id of REQUIRED_DOM_IDS) {
      expect(html, `missing #${id}`).toContain(`id="${id}"`);
    }
  });

  it("loads the module entry and stylesheet hub", () => {
    const html = readFileSync(join(root, "index.html"), "utf8");
    expect(html).toContain('<script type="module" src="js/game.js">');
    expect(html).toContain('<link rel="stylesheet" href="css/styles.css" />');
  });
});
