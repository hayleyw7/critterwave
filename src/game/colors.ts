import { colorThemeSurfaces, getColorTheme, type ColorThemeSurfaces } from "../lib/color-themes.js";
import { foeColorConflictsWithHero as heroFoeColorConflicts } from "../lib/game-logic.js";
import { FOE_COLOR_THEMES } from "./constants.js";
import { el } from "./dom.js";
import { gameState } from "./state.js";
import type { FoeColorTheme, HeroColorTheme } from "./types.js";

export function foeColorConflictsWithHero(theme: FoeColorTheme): boolean {
  return heroFoeColorConflicts(gameState.heroColorTheme, theme);
}

export function getAvailableFoeColorThemes(excludeLast: boolean): FoeColorTheme[] {
  let options = FOE_COLOR_THEMES.filter((theme) => !foeColorConflictsWithHero(theme));
  if (excludeLast && gameState.lastFoeColorTheme !== null) {
    const withoutLast = options.filter((theme) => theme !== gameState.lastFoeColorTheme);
    if (withoutLast.length > 0) {
      options = withoutLast;
    }
  }
  return options;
}

export function pickNextFoeColor(): FoeColorTheme {
  let options = getAvailableFoeColorThemes(true);
  if (options.length === 0) {
    options = getAvailableFoeColorThemes(false);
  }
  if (options.length === 0) {
    options = FOE_COLOR_THEMES.filter((theme) => !foeColorConflictsWithHero(theme));
  }
  const picked = options[Math.floor(Math.random() * options.length)] ?? "amber";
  gameState.lastFoeColorTheme = picked;
  gameState.foeColorTheme = picked;
  return picked;
}

export function ensureFoeColorDistinctFromHero(): void {
  if (!foeColorConflictsWithHero(gameState.foeColorTheme)) return;
  pickNextFoeColor();
}

export function applyCardHypeStatColors(
  panel: HTMLElement,
  varPrefix: "hero" | "foe",
  colors: ColorThemeSurfaces
): void {
  panel.style.setProperty(
    `--${varPrefix}-hype-text`,
    `color-mix(in srgb, ${colors.accent} 55%, ${colors.dark})`
  );
}

export function applyFoeColorTheme(theme: FoeColorTheme): void {
  const panel = el.foePanel.querySelector(".enemy-status") as HTMLElement | null;
  if (!panel) return;
  for (const name of FOE_COLOR_THEMES) {
    panel.classList.remove(`foe-theme-${name}`);
  }
  panel.classList.add(`foe-theme-${theme}`);
  const colors = colorThemeSurfaces(getColorTheme(theme), gameState.currentColorMode);
  panel.style.setProperty("--foe-accent", colors.accent);
  panel.style.setProperty("--foe-accent-dark", colors.dark);
  panel.style.setProperty("--foe-panel-bg", colors.panelBg);
  panel.style.setProperty("--foe-plate-bg", colors.plateBg);
  panel.style.setProperty("--foe-plate-text", colors.plateText);
  panel.style.setProperty("--foe-hp-wrap-bg", colors.hpWrapBg);
  panel.style.setProperty("--foe-divider", colors.divider);
  panel.style.setProperty("--foe-buff-bg", colors.buffBg);
  applyCardHypeStatColors(panel, "foe", colors);
  el.gameShell.style.setProperty("--foe-accent", colors.accent);
  el.gameShell.style.setProperty("--foe-accent-dark", colors.dark);
  el.gameShell.style.setProperty(
    "--battle-foe-text",
    gameState.currentColorMode === "dark" ? colors.accent : colors.plateText
  );
}

export function applyHeroColorTheme(theme: HeroColorTheme): void {
  const colors = colorThemeSurfaces(getColorTheme(theme), gameState.currentColorMode);
  gameState.heroColorTheme = theme;
  el.playerPanel.style.setProperty("--hero", colors.accent);
  el.playerPanel.style.setProperty("--hero-dark", colors.dark);
  el.playerPanel.style.setProperty("--hero-panel-bg", colors.panelBg);
  el.playerPanel.style.setProperty("--hero-plate-bg", colors.plateBg);
  el.playerPanel.style.setProperty("--hero-plate-text", colors.plateText);
  el.playerPanel.style.setProperty("--hero-hp-wrap-bg", colors.hpWrapBg);
  el.playerPanel.style.setProperty("--hero-divider", colors.divider);
  applyCardHypeStatColors(el.playerPanel, "hero", colors);
  el.gameShell.style.setProperty("--hero", colors.accent);
  el.gameShell.style.setProperty("--hero-dark", colors.dark);
  el.gameShell.style.setProperty(
    "--battle-hero-text",
    gameState.currentColorMode === "dark" ? colors.accent : colors.plateText
  );
  el.xpFill.style.background = colors.accent;
}
