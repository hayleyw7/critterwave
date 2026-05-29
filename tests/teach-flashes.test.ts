import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { FOE_FOLLOW_UP_DELAY_MS } from "../src/lib/combat-gate.js";

const cssPath = join(dirname(fileURLToPath(import.meta.url)), "../css/styles.css");
const styles = readFileSync(cssPath, "utf8");

describe("teach flash presentation", () => {
  it("hype text stagger matches foe follow-up pop delay", () => {
    expect(FOE_FOLLOW_UP_DELAY_MS).toBe(200);
    expect(styles).toContain("--hype-meter-text-stagger: 200ms");
  });

  it("staggers hype text after bar on first-hype and maxed flashes", () => {
    const firstDanceBar = styles.match(
      /\.hype-stat-wrap\.hype-first-dance-flash \.hype-bar \{[^}]+\}/
    )?.[0];
    const firstDanceStat = styles.match(
      /\.hype-stat-wrap\.hype-first-dance-flash \.hype-stat \{[^}]+\}/
    )?.[0];
    const maxedStat = styles.match(
      /\.hype-stat-wrap\.hype-maxed-flash \.hype-stat \{[^}]+\}/
    )?.[0];

    expect(firstDanceBar).toContain("animation: hype-teach-pulse");
    expect(firstDanceBar).not.toContain("animation-delay");
    expect(firstDanceStat).toContain("animation-delay: var(--hype-meter-text-stagger)");
    expect(maxedStat).toContain("animation-delay: var(--hype-meter-text-stagger)");
  });

  it("defines hp teach pulse for player and foe bars", () => {
    expect(styles).toContain(".hp-bar.hp-first-heal-flash .player-hp");
    expect(styles).toContain(".hp-bar.hp-first-attack-flash .foe-hp");
    expect(styles).toContain(".hp-bar.hp-first-wave-heal-flash .player-hp");
    expect(styles).toContain("@keyframes hp-teach-pulse");
  });
});
