import { isColorThemeId } from "../lib/color-themes.js";
import { normalizeHeroName } from "../lib/game-logic.js";
import { sanitizeSavedHeroName } from "../lib/save-validation.js";
import { DEFAULT_HERO_COLOR_THEME, DEFAULT_HERO_LABEL } from "./constants.js";
import { HEROES } from "./data.js";
import { el } from "./dom.js";
import type { HeroColorTheme, SaveData } from "./types.js";
import { getColorTheme } from "../lib/color-themes.js";

export function getHeroLabelForEmoji(emoji: string): string {
  return HEROES.find((h) => h.emoji === emoji)?.label ?? DEFAULT_HERO_LABEL;
}

export function readHeroNameFromSetup(): string {
  return normalizeHeroName(el.heroNameInput.value);
}

export function isHeroColorTheme(value: string): value is HeroColorTheme {
  return isColorThemeId(value);
}

export function resolveSavedHeroName(save: SaveData, emoji: string): string {
  return sanitizeSavedHeroName(
    save.heroName,
    save.heroLabel,
    getHeroLabelForEmoji(emoji)
  );
}

export function resolveHeroColorTheme(save: SaveData): HeroColorTheme {
  if (save.heroColorTheme && isHeroColorTheme(save.heroColorTheme)) {
    return save.heroColorTheme;
  }
  return DEFAULT_HERO_COLOR_THEME;
}

export function getHeroColorThemeDefinition(theme: HeroColorTheme) {
  return getColorTheme(theme);
}
