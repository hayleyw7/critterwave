import { describe, expect, it } from "vitest";
import {
  COLOR_THEME_IDS,
  COLOR_THEMES,
  DEFAULT_COLOR_THEME,
  colorThemeSurfaces,
  getColorTheme,
  isColorThemeId,
} from "../src/lib/color-themes.js";

describe("color themes", () => {
  it("lists every theme id exactly once", () => {
    expect(COLOR_THEME_IDS).toHaveLength(COLOR_THEMES.length);
    expect(new Set(COLOR_THEME_IDS).size).toBe(COLOR_THEME_IDS.length);
    for (const theme of COLOR_THEMES) {
      expect(COLOR_THEME_IDS).toContain(theme.id);
    }
  });

  it("defaults to green", () => {
    expect(DEFAULT_COLOR_THEME).toBe("green");
    expect(getColorTheme(DEFAULT_COLOR_THEME).id).toBe("green");
  });

  it("validates theme ids", () => {
    expect(isColorThemeId("fuchsia")).toBe(true);
    expect(isColorThemeId("pink")).toBe(false);
    expect(isColorThemeId("")).toBe(false);
  });

  it("returns a full theme object for known ids", () => {
    const theme = getColorTheme("coral");
    expect(theme.label).toBe("Coral");
    expect(theme.accent).toMatch(/^#/);
    expect(theme.plateBg).toContain("rgba");
  });

  it("falls back to the first theme for unknown ids at runtime", () => {
    expect(getColorTheme("green" as "coral").id).toBe("green");
  });

  it("tints accent surfaces for light mode while keeping plates vivid", () => {
    const theme = getColorTheme("green");
    const dark = colorThemeSurfaces(theme, "dark");
    const light = colorThemeSurfaces(theme, "light");
    expect(light.accent).toBe(theme.accent);
    expect(light.plateText).toBe(theme.dark);
    expect(light.plateBg).toContain("color-mix");
    expect(light.panelBg).toContain("color-mix");
    expect(light.plateBg).not.toBe(dark.plateBg);
    expect(light.panelBg).not.toBe(dark.panelBg);
  });

  it("keeps fuchsia distinct from rose", () => {
    const fuchsia = getColorTheme("fuchsia");
    const rose = getColorTheme("rose");
    expect(fuchsia.accent).not.toBe(rose.accent);
    expect(fuchsia.dark).not.toBe(rose.dark);
  });
});
