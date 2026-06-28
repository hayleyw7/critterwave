import { closeFooterDropdowns } from "./audio.js";
import { applyColorMode, parseColorMode, runColorModeTransition } from "../lib/color-mode.js";
import { applyFoeColorTheme, applyHeroColorTheme } from "./colors.js";
import { el } from "./dom.js";
import { loadSave as loadSaveFromStorage, readPersistedFields, withSaveMeta as withSaveMetaForMode, writeSaveJson } from "./save-io.js";
import { gameState } from "./state.js";

export function initColorMode(): void {
  gameState.currentColorMode = parseColorMode(
    loadSaveFromStorage(gameState.currentColorMode).colorMode
  );
  applyColorMode(gameState.currentColorMode);
  updateThemeToggleUi();
  applyHeroColorTheme(gameState.heroColorTheme);
  applyFoeColorTheme(gameState.foeColorTheme);
}

export function updateThemeToggleUi(): void {
  const isDark = gameState.currentColorMode === "dark";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";
  el.themeToggle.setAttribute("aria-pressed", isDark ? "false" : "true");
  el.themeToggle.setAttribute("aria-label", label);
  el.themeToggle.setAttribute("title", label);
  el.themeToggleIcon.textContent = isDark ? "☀" : "☾";
}

export function toggleColorMode(): void {
  closeFooterDropdowns();
  const nextMode = gameState.currentColorMode === "dark" ? "light" : "dark";
  gameState.currentColorMode = nextMode;
  runColorModeTransition(() => {
    applyColorMode(nextMode);
    updateThemeToggleUi();
    applyHeroColorTheme(gameState.heroColorTheme);
    applyFoeColorTheme(gameState.foeColorTheme);
  });
  writeSaveJson(withSaveMetaForMode(readPersistedFields(), gameState.currentColorMode));
}

export function renderRecords(): void {
  const save = loadSaveFromStorage(gameState.currentColorMode);
  el.bestWave.textContent = String(save.bestWave);
  el.runs.textContent = String(save.runsPlayed);
}
