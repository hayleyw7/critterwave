/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it } from "vitest";
import { COLOR_THEME_IDS } from "../../src/lib/color-themes.js";
import { foeColorConflictsWithHero } from "../../src/lib/game-logic.js";
import {
  getAvailableFoeColorThemes,
  foeColorConflictsWithHero as colorsFoeConflict,
} from "../../src/game/colors.js";
import { gameState } from "../../src/game/state.js";

describe("colors — foe color themes", () => {
  beforeEach(() => {
    gameState.heroColorTheme = "green";
    gameState.lastFoeColorTheme = null;
  });

  it("matches game-logic conflict rules", () => {
    for (const theme of COLOR_THEME_IDS) {
      expect(colorsFoeConflict(theme)).toBe(
        foeColorConflictsWithHero(gameState.heroColorTheme, theme)
      );
    }
  });

  it("excludes hero-conflicting themes from available options", () => {
    const options = getAvailableFoeColorThemes(false);
    expect(options.every((theme) => !colorsFoeConflict(theme))).toBe(true);
    expect(options.length).toBeGreaterThan(0);
  });

  it("prefers not repeating the last foe color when possible", () => {
    gameState.lastFoeColorTheme = "amber";
    const withoutLast = getAvailableFoeColorThemes(true);
    expect(withoutLast).not.toContain("amber");
    expect(withoutLast.length).toBeGreaterThan(0);
  });

  it("excludeLast false keeps the previous foe color in the pool", () => {
    gameState.lastFoeColorTheme = "amber";
    expect(getAvailableFoeColorThemes(false)).toContain("amber");
    expect(getAvailableFoeColorThemes(true)).not.toContain("amber");
  });
});
