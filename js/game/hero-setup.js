import { isColorThemeId } from "../lib/color-themes.js";
import { normalizeHeroName } from "../lib/game-logic.js";
import { sanitizeSavedHeroName } from "../lib/save-validation.js";
import { DEFAULT_HERO_COLOR_THEME, DEFAULT_HERO_LABEL } from "./constants.js";
import { HEROES } from "./data.js";
import { el } from "./dom.js";
import { getColorTheme } from "../lib/color-themes.js";
export function getHeroLabelForEmoji(emoji) {
    return HEROES.find((h) => h.emoji === emoji)?.label ?? DEFAULT_HERO_LABEL;
}
export function readHeroNameFromSetup() {
    return normalizeHeroName(el.heroNameInput.value);
}
export function isHeroColorTheme(value) {
    return isColorThemeId(value);
}
export function resolveSavedHeroName(save, emoji) {
    return sanitizeSavedHeroName(save.heroName, save.heroLabel, getHeroLabelForEmoji(emoji));
}
export function resolveHeroColorTheme(save) {
    if (save.heroColorTheme && isHeroColorTheme(save.heroColorTheme)) {
        return save.heroColorTheme;
    }
    return DEFAULT_HERO_COLOR_THEME;
}
export function getHeroColorThemeDefinition(theme) {
    return getColorTheme(theme);
}
