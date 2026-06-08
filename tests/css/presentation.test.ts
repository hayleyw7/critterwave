import { describe, expect, it } from "vitest";
import { readCssModule } from "./bundle.js";

describe("css/presentation.css — teach flashes", () => {
  const styles = readCssModule("presentation.css");

  it("flashes hype bar and text in unison on first-hype and maxed flashes", () => {
    const flashRule = styles.match(
      /\.hype-stat-wrap\.hype-first-dance-flash \.hype-bar,\s*[\s\S]*?animation: hype-teach-flash 0\.45s ease-out 3;/
    )?.[0];

    expect(flashRule).toContain(".hype-stat-wrap.hype-first-dance-flash .hype-stat");
    expect(flashRule).toContain(".hype-stat-wrap.hype-maxed-flash .hype-bar");
    expect(flashRule).toContain(".hype-stat-wrap.hype-maxed-flash .hype-stat");
    expect(flashRule).not.toContain("animation-delay");
    expect(styles).toContain("@keyframes hype-teach-flash");
    expect(styles).not.toContain("@keyframes hype-teach-text-pulse");
  });

  it("defines hp teach pulse on the bar track (not the fill)", () => {
    expect(styles).toContain(".hp-bar.hp-first-heal-flash");
    expect(styles).toContain(".hp-bar.hp-first-attack-flash");
    expect(styles).toContain(".hp-bar.hp-first-wave-heal-flash");
    expect(styles).toContain("@keyframes hp-teach-pulse");
    expect(styles).not.toMatch(
      /\.hp-bar\.hp-first-heal-flash \.player-hp[\s\S]*?animation: hp-teach-pulse/
    );
  });
});

describe("css/combat.css — teach keyframes", () => {
  const styles = readCssModule("combat.css");

  it("defines command hint pulse animation", () => {
    expect(styles).toContain("@keyframes cmd-hint-pulse");
    expect(styles).toContain(".command-menu .cmd.cmd-hint-flash");
  });
});
