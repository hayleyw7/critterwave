import { COLOR_THEMES } from "../lib/color-themes.js";
import { formatSetupBlockerMessage, getSetupBlockers as getSetupBlockersForInput } from "../lib/game-logic.js";
import { applyHeroColorTheme } from "./colors.js";
import { SETUP_NAME_TEACH_FLASH_MS } from "./constants.js";
import { el } from "./dom.js";
import { getHeroColorThemeDefinition, readHeroNameFromSetup } from "./hero-setup.js";
import { gameState } from "./state.js";
import type { HeroColorTheme } from "./types.js";

export function updateHeroColorTogglePreview(): void {
  const colors = getHeroColorThemeDefinition(gameState.pendingHeroColorTheme);
  const swatch = el.heroColorToggle.querySelector(
    ".setup-color-toggle-swatch"
  ) as HTMLElement | null;
  swatch?.style.setProperty("--swatch-color", colors.accent);
  el.heroColorToggle.setAttribute("aria-label", `Card color: ${colors.label}`);
}

export function openHeroColorPopup(): void {
  el.heroColorPopup.classList.remove("hidden");
  el.heroColorToggle.setAttribute("aria-expanded", "true");
}

export function closeHeroColorPopup(): void {
  el.heroColorPopup.classList.add("hidden");
  el.heroColorToggle.setAttribute("aria-expanded", "false");
}

export function toggleHeroColorPopup(): void {
  if (el.heroColorPopup.classList.contains("hidden")) {
    openHeroColorPopup();
  } else {
    closeHeroColorPopup();
  }
}

export function bindSetupColorPicker(): void {
  if (gameState.setupColorPickerBound) return;
  gameState.setupColorPickerBound = true;
  el.heroColorToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleHeroColorPopup();
  });
  document.addEventListener("click", (e) => {
    if (el.heroColorPopup.classList.contains("hidden")) return;
    const target = e.target as Node;
    if (!el.heroColorPopup.contains(target) && !el.heroColorToggle.contains(target)) {
      closeHeroColorPopup();
    }
  });
}

export function readHeroColorThemeFromSetup(): HeroColorTheme {
  return gameState.pendingHeroColorTheme;
}

export function syncHeroColorSwatchSelection(): void {
  for (const btn of el.heroColorSwatches.querySelectorAll<HTMLButtonElement>(
    ".setup-color-swatch"
  )) {
    btn.classList.toggle("selected", btn.dataset.theme === gameState.pendingHeroColorTheme);
    btn.setAttribute(
      "aria-checked",
      btn.dataset.theme === gameState.pendingHeroColorTheme ? "true" : "false"
    );
  }
}

export function buildHeroColorSwatches(onDraftChange?: () => void): void {
  if (!el.heroColorSwatches) return;
  el.heroColorSwatches.replaceChildren();
  for (const theme of COLOR_THEMES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "setup-color-swatch";
    btn.dataset.theme = theme.id;
    btn.style.setProperty("--swatch-color", theme.accent);
    btn.setAttribute("role", "radio");
    btn.setAttribute("aria-label", theme.label);
    btn.setAttribute(
      "aria-checked",
      theme.id === gameState.pendingHeroColorTheme ? "true" : "false"
    );
    if (theme.id === gameState.pendingHeroColorTheme) {
      btn.classList.add("selected");
    }
    btn.addEventListener("click", () => {
      gameState.pendingHeroColorTheme = theme.id;
      applyHeroColorTheme(theme.id);
      syncHeroColorSwatchSelection();
      updateHeroColorTogglePreview();
      closeHeroColorPopup();
      onDraftChange?.();
    });
    el.heroColorSwatches.appendChild(btn);
  }
  updateHeroColorTogglePreview();
}

export function getSetupBlockers(): string[] {
  return getSetupBlockersForInput(gameState.pendingHeroEmoji, el.heroNameInput.value);
}

export function updateSetupStartButton(): void {
  const blockers = getSetupBlockers();
  const canStart = blockers.length === 0;
  const nameMissing = blockers.includes("enter your name");
  const hintBlockers = blockers.filter((blocker) => blocker !== "enter your name");

  el.setupStartBtn.disabled = false;
  el.setupStartBtn.classList.toggle("cmd-start-ready", canStart);
  el.heroNameInput.classList.toggle(
    "setup-name-input--highlight",
    gameState.setupHintForced && nameMissing
  );
  el.heroNameInput.setAttribute(
    "aria-invalid",
    gameState.setupHintForced && nameMissing ? "true" : "false"
  );

  if (canStart || !gameState.setupHintForced) {
    if (canStart) {
      gameState.setupHintForced = false;
    }
    el.setupHint.hidden = true;
    el.setupHint.textContent = "";
    el.setupHint.classList.remove("setup-hint-error");
    return;
  }

  if (hintBlockers.length === 0) {
    el.setupHint.hidden = true;
    el.setupHint.textContent = "";
    el.setupHint.classList.remove("setup-hint-error");
    return;
  }

  el.setupHint.hidden = false;
  el.setupHint.textContent = formatSetupBlockerMessage(hintBlockers);
  el.setupHint.classList.add("setup-hint-error");
}

export function playSetupNameTeachFlash(): void {
  el.heroNameInput.classList.remove("setup-name-teach-flash");
  void el.heroNameInput.offsetWidth;
  el.heroNameInput.classList.add("setup-name-teach-flash");
  window.setTimeout(() => {
    el.heroNameInput.classList.remove("setup-name-teach-flash");
  }, SETUP_NAME_TEACH_FLASH_MS);
}

export function showSetupBlockedHint(): void {
  gameState.setupHintForced = true;
  updateSetupStartButton();
  if (!readHeroNameFromSetup()) {
    playSetupNameTeachFlash();
    el.heroNameInput.focus();
  } else {
    el.heroPicker.focus();
  }
}
