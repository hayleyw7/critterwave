import {
  buildFoeOrder as buildFoeOrderForHero,
  DEFEAT_VERBS,
  foeColorConflictsWithHero as heroFoeColorConflicts,
  formatFoeInText as formatFoeMessage,
  formatSetupBlockerMessage,
  getSetupBlockers as getSetupBlockersForInput,
  HERO_NAME_MAX_LENGTH,
  HYPE_ATTACK_PER_LEVEL,
  HYPE_MAX,
  applyPlayerHealRoll,
  applyHypeGain,
  hypeAfterTakingHit,
  applyPlayerStatsForWave,
  clampHype,
  formatHypeLabel as formatHypeStatLabel,
  healHpAfterWaveVictory,
  hypeHeadroom,
  isLevelBandFinale,
  advanceFoeQueueAfterFlee,
  advanceFoeQueueAfterVictory,
  buildInitialFoeQueue,
  buildQueueCycleFromWave,
  makeFoeFromQueueHead,
  makeFoeFromTemplate,
  nextDefeatVerb as advanceDefeatVerb,
  pickFoeFromOrder,
  playerLevelForWave,
  playerStatsForWave,
  refreshWaveFoeFromTemplate,
  WAVES_PER_LEVEL,
  xpProgressForDisplay,
  xpProgressForWave,
  xpPercentForDisplay,
  xpPercentForWave,
  normalizeHeroName,
  restoreFoeOrder as restoreFoeOrderForHero,
  randomDamage,
} from "../lib/game-logic.js";
import {
  formatDanceHypeTail,
  getPlayerHypeGain,
  getFoeHypeGain,
  pickRandomDanceOpener,
  pickRandomDanceResponse,
  pickFirstDanceResponse,
  resetDancePicker,
} from "../content/dance-responses.js";
import {
  appendBattleActionMeta,
  appendBattleLine,
  setBattleLines,
  type BattleActionLabel,
} from "../lib/battle-log-dom.js";
import {
  clampInt,
  isDebugHost,
  parsePendingConfirm,
  parseSaveMeta,
  type PendingConfirmKind,
  sanitizeGamePhase,
  sanitizeHypeLevel,
  sanitizeIdList,
  sanitizeSavedHeroName,
  sanitizeSnapshotFoe,
  sanitizeSnapshotPlayer,
  sanitizeTurn,
  sanitizeWave,
} from "../lib/save-validation.js";
import {
  HERO_PICKER_ORDER,
  isHeroEmojiHiddenInPicker,
  isMobileHeroPickerViewport,
  resolveHeroPickerEmoji,
} from "../lib/hero-groups.js";
import {
  COLOR_THEMES,
  getColorTheme,
  colorThemeSurfaces,
  isColorThemeId,
  type ColorThemeSurfaces,
} from "../lib/color-themes.js";
import {
  applyColorMode,
  parseColorMode,
  runColorModeTransition,
  type ColorMode,
} from "../lib/color-mode.js";
import {
  beginAwaitingFoeResponse,
  blockCombatForScreenEnd,
  canUseCombatActions as canUseCombatActionsGate,
  finishCombatAction as finishCombatActionGate,
  foeFollowUpDelayMs,
  FOE_FOLLOW_UP_DELAY_MS,
  isFollowUpTimerStale,
  resetCombatGate,
  tryLockCombat as tryLockCombatGate,
  type CombatGateState,
} from "../lib/combat-gate.js";
import {
  createCombatHintsState,
  combatHintsAfterMidRunRestore,
  combatHintsForSnapshot,
  attackTeachText,
  deferDanceHintAfterRun,
  maybeArmDanceHintForWave,
  onNextFoeForHints,
  onVictoryForHints,
  recordAttackForHints,
  recordDanceForHints,
  recordHealForHints,
  recordPlayerDamageForHints,
  tryCelebrateFirstFoeHype,
  tryCelebrateFirstPlayerHype,
  tryCelebrateFirstWaveVictoryHeal,
  hypeMaxPresentation,
  recordRunForHints,
  shouldShowAttackHint,
  shouldShowDanceHint,
  shouldShowDanceTeachCopy,
  shouldShowHealHint,
  shouldShowHealTeachCopy,
  shouldShowRunHint,
  shouldShowRunTeachCopy,
  type CombatHintsState,
} from "../lib/combat-hints.js";
import {
  startVictoryCelebration,
  stopVictoryCelebration,
} from "../ui/victory-celebration.js";
import {
  FOES,
  FOES_BY_ID,
  FOE_IDS,
  HEROES,
  HERO_EMOJIS,
} from "./data.js";
import { el } from "./dom.js";
import {
  CAMPAIGN_WAVES,
  DANCE_ANIM_MS,
  DEATH_BEAT_MS,
  DEFAULT_HERO_COLOR_THEME,
  DEFAULT_HERO_EMOJI,
  DEFAULT_HERO_LABEL,
  DEFAULT_PLAYER_NAME,
  FOE_COLOR_THEMES,
  FOE_ENTRANCE_MS,
  FOE_POOF_MS,
  GOLD_FLASH_MS,
  HEAL_ANIM_MS,
  HELP_OPEN_KEY,
  HP_TEACH_FLASH_MS,
  HYPE_METER_FLASH_MS,
  LEVEL_UP_NOTICE_MS,
  MOBILE_TEACH_LAYOUT_MQ,
  PENDING_CONFIRM_OPTIONS,
  SETUP_NAME_TEACH_FLASH_MS,
  SKIP_EXIT_FLUSH_KEY,
  STORAGE_KEY,
  XP_FILL_BEAT_MS,
} from "./constants.js";
import type {
  BattleLogEntry,
  CombatTeachPopupId,
  ConfirmOptions,
  DebugCombatAction,
  Enemy,
  FoeColorTheme,
  FoeTemplate,
  GameSnapshot,
  HeroColorTheme,
  HeroOption,
  LegacySnapshot,
  Player,
  SaveData,
} from "./types.js";

import { gameState } from "./state.js";
import { getCampaignLength, getHealMax, getEffectiveAttack, getEffectiveFoeAttack } from "./stats.js";
import { persist, persistSetupDraft, loadSave, withSaveMeta, readPersistedFields } from "./persistence.js";

let endGameHandler: (() => void) | null = null;

export function registerEndGameHandler(handler: () => void): void {
  endGameHandler = handler;
}

export function initColorMode(): void {
  gameState.currentColorMode = parseColorMode(loadSave().colorMode);
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
  el.footerMore.open = false;
  const nextMode = gameState.currentColorMode === "dark" ? "light" : "dark";
  gameState.currentColorMode = nextMode;
  runColorModeTransition(() => {
    applyColorMode(nextMode);
    updateThemeToggleUi();
    applyHeroColorTheme(gameState.heroColorTheme);
    applyFoeColorTheme(gameState.foeColorTheme);
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(withSaveMeta(readPersistedFields())));
}

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


export function getHeroLabelForEmoji(emoji: string): string {
  return HEROES.find((h) => h.emoji === emoji)?.label ?? DEFAULT_HERO_LABEL;
}

export function resolveSavedHeroName(save: SaveData, emoji: string): string {
  return sanitizeSavedHeroName(
    save.heroName,
    save.heroLabel,
    getHeroLabelForEmoji(emoji)
  );
}

export function readHeroNameFromSetup(): string {
  return normalizeHeroName(el.heroNameInput.value);
}

export function isHeroColorTheme(value: string): value is HeroColorTheme {
  return isColorThemeId(value);
}

export function getHeroColorThemeDefinition(theme: HeroColorTheme) {
  return getColorTheme(theme);
}

export function resolveHeroColorTheme(save: SaveData): HeroColorTheme {
  if (save.heroColorTheme && isHeroColorTheme(save.heroColorTheme)) {
    return save.heroColorTheme;
  }
  return DEFAULT_HERO_COLOR_THEME;
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
    if (
      !el.heroColorPopup.contains(target) &&
      !el.heroColorToggle.contains(target)
    ) {
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

export function buildHeroColorSwatches(): void {
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
    btn.setAttribute("aria-checked", theme.id === gameState.pendingHeroColorTheme ? "true" : "false");
    if (theme.id === gameState.pendingHeroColorTheme) {
      btn.classList.add("selected");
    }
    btn.addEventListener("click", () => {
      gameState.pendingHeroColorTheme = theme.id;
      applyHeroColorTheme(theme.id);
      syncHeroColorSwatchSelection();
      updateHeroColorTogglePreview();
      closeHeroColorPopup();
      persistSetupDraft();
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

export function applyPlayerDanceBuff(amount = 1): void {
  gainPlayerHype(amount);
}

export function applyFoeDanceBuff(amount = 1): void {
  gainFoeHype(amount);
}

export function formatHypeAriaLabel(level: number): string {
  const clamped = clampHype(level);
  return `HYPE ${clamped} of ${HYPE_MAX}`;
}

export function clearAllHype(): void {
  gameState.hypeLevel = 0;
  gameState.foeHypeLevel = 0;
  gameState.displayedPlayerHype = 0;
  gameState.displayedFoeHype = 0;
}

export function syncHypeMaxPresentation(
  wrap: HTMLElement,
  level: number,
  side: "player" | "foe"
): void {
  const previous = side === "player" ? gameState.displayedPlayerHype : gameState.displayedFoeHype;
  const pres = hypeMaxPresentation(previous, level);
  wrap.classList.toggle("hype-maxed", pres.atMax);
  if (pres.flashReachedMax && !gameState.suppressTeachFlashesThisRender) {
    wrap.classList.remove("hype-maxed-flash");
    void wrap.offsetWidth;
    wrap.classList.add("hype-maxed-flash");
    window.setTimeout(() => wrap.classList.remove("hype-maxed-flash"), HYPE_METER_FLASH_MS);
  }
  const clamped = clampHype(level);
  if (side === "player") {
    gameState.displayedPlayerHype = clamped;
  } else {
    gameState.displayedFoeHype = clamped;
  }
}

export function applyPlayerHitHypeLoss(damageDealt: number): void {
  gameState.hypeLevel = hypeAfterTakingHit(gameState.hypeLevel, damageDealt);
}

export function applyFoeHitHypeLoss(damageDealt: number): void {
  gameState.foeHypeLevel = hypeAfterTakingHit(gameState.foeHypeLevel, damageDealt);
}

export function renderHypeMeter(
  wrap: HTMLElement,
  statusPanel: HTMLElement,
  bar: HTMLElement,
  fill: HTMLElement,
  label: HTMLElement,
  level: number,
  side: "player" | "foe"
): void {
  const clamped = clampHype(level);
  label.textContent = formatHypeStatLabel(clamped);
  label.setAttribute("aria-label", formatHypeAriaLabel(clamped));
  setHpBar(fill, clamped, HYPE_MAX);
  bar.setAttribute("aria-valuenow", String(clamped));
  bar.setAttribute("aria-valuemax", String(HYPE_MAX));
  statusPanel.classList.toggle("hype-full", clamped >= HYPE_MAX);
  syncHypeMaxPresentation(wrap, level, side);
}

export function foeDisplayName(): string {
  return gameState.foe?.name ?? "foe";
}

export function formatFoeInText(template: string): string {
  return formatFoeMessage(template, foeDisplayName());
}

export function renderRecords(): void {
  const save = loadSave();
  el.bestWave.textContent = String(save.bestWave);
  el.runs.textContent = String(save.runsPlayed);
}

export function setHpBar(fill: HTMLElement, current: number, max: number): void {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  fill.style.width = `${pct}%`;
}

export function canBeDefeatedByNextHit(hp: number, incomingAttack: number): boolean {
  return hp > 0 && incomingAttack >= hp;
}

export function playXpBarFullBeat(): Promise<void> {
  if (gameState.debugInstantTransitions) {
    const { max } = xpProgressForWave(gameState.wave);
    setHpBar(el.xpFill, max, max);
    el.xpText.textContent = "100%";
    el.xpBar.setAttribute("aria-valuenow", String(max));
    el.xpBar.setAttribute("aria-valuemax", String(max));
    return Promise.resolve();
  }
  const { max } = xpProgressForWave(gameState.wave);
  setHpBar(el.xpFill, max, max);
  el.xpText.textContent = "100%";
  el.xpBar.setAttribute("aria-valuenow", String(max));
  el.xpBar.setAttribute("aria-valuemax", String(max));
  return pause(XP_FILL_BEAT_MS);
}

export function playFirstHypeFlash(wrap: HTMLElement): void {
  wrap.classList.add("hype-first-dance-flash");
  window.setTimeout(() => {
    wrap.classList.remove("hype-first-dance-flash");
  }, HYPE_METER_FLASH_MS);
}

export function gainPlayerHype(amount: number): void {
  if (amount <= 0) {
    return;
  }
  gameState.hypeLevel = applyHypeGain(gameState.hypeLevel, amount);
}

export function gainFoeHype(amount: number): void {
  if (amount <= 0) {
    return;
  }
  gameState.foeHypeLevel = applyHypeGain(gameState.foeHypeLevel, amount);
}

export function syncFirstHypeFlashes(): void {
  if (gameState.suppressTeachFlashesThisRender) {
    return;
  }

  const skipPlayer = gameState.skipPlayerHypeTeachThisRender;
  gameState.skipPlayerHypeTeachThisRender = false;

  if (!skipPlayer) {
    const playerHypeResult = tryCelebrateFirstPlayerHype(gameState.combatHints, gameState.hypeLevel);
    gameState.combatHints = playerHypeResult.flags;
    if (playerHypeResult.flashFirstHype) {
      playFirstHypeFlash(el.playerHypeWrap);
    }
  }

  const foeHypeResult = tryCelebrateFirstFoeHype(gameState.combatHints, gameState.foeHypeLevel);
    gameState.combatHints = foeHypeResult.flags;
    if (foeHypeResult.flashFirstHype) {
    playFirstHypeFlash(el.foeHypeWrap);
  }
}

export function playHpBarTeachFlash(fill: HTMLElement, className: string): void {
  const bar = fill.parentElement;
  if (!bar) {
    return;
  }
  bar.classList.remove(className);
  void bar.offsetWidth;
  bar.classList.add(className);
  window.setTimeout(() => bar.classList.remove(className), HP_TEACH_FLASH_MS);
}

export function playFirstHealHpFlash(): void {
  playHpBarTeachFlash(el.playerHpFill, "hp-first-heal-flash");
}

export function playFirstPlayerDamageHpFlash(): void {
  playHpBarTeachFlash(el.playerHpFill, "hp-first-damage-flash");
}

export function playFirstAttackFoeHpFlash(): void {
  playHpBarTeachFlash(el.foeHpFill, "hp-first-attack-flash");
}

export function playFirstWaveVictoryHealHpFlash(): void {
  playHpBarTeachFlash(el.playerHpFill, "hp-first-wave-heal-flash");
}

export function syncCombatHintClasses(): void {
  if (!el.healBtn || !el.danceBtn || !el.attackBtn || !el.runBtn) {
    return;
  }
  const hasFoe = gameState.foe !== null;
  const showAttack = shouldShowAttackHint(gameState.combatHints, gameState.phase, hasFoe);
  const showHeal = shouldShowHealHint(
    gameState.combatHints,
    gameState.player.hp,
    gameState.player.maxHp,
    gameState.phase,
    hasFoe,
    gameState.foe?.attack ?? 0,
    gameState.foeHypeLevel
  );
  const showRun =
    gameState.foe !== null &&
    shouldShowRunHint(
      gameState.combatHints,
      gameState.player.hp,
      gameState.foe.attack,
      gameState.foeHypeLevel,
      gameState.phase,
      hasFoe
    );
  const showDance = shouldShowDanceHint(
    gameState.combatHints,
    gameState.player.hp,
    gameState.player.maxHp,
    gameState.phase,
    hasFoe,
    gameState.hypeLevel,
    gameState.foe?.attack ?? 0,
    gameState.foeHypeLevel
  );
  el.attackBtn.classList.toggle("cmd-hint-flash", showAttack);
  el.healBtn.classList.toggle("cmd-hint-flash", showHeal);
  el.danceBtn.classList.toggle("cmd-hint-flash", showDance);
  el.runBtn.classList.toggle("cmd-hint-flash", showRun);
  el.attackBtn.dataset.combatHint = showAttack ? "on" : "off";
  el.healBtn.dataset.combatHint = showHeal ? "on" : "off";
  el.danceBtn.dataset.combatHint = showDance ? "on" : "off";
  el.runBtn.dataset.combatHint = showRun ? "on" : "off";
  syncCombatTeachPopups(showHeal, showDance, showRun);
}

export function clearFooterTeachPopupPosition(popup: HTMLElement): void {
  popup.style.left = "";
  popup.style.top = "";
  popup.style.right = "";
  popup.style.bottom = "";
  popup.style.transform = "";
  popup.style.maxWidth = "";
  popup.style.removeProperty("--teach-arrow-offset");
  popup.style.removeProperty("--teach-arrow-offset-end");
}

export function teachPopupGapPx(): number {
  const raw = getComputedStyle(el.gameShell).getPropertyValue("--space-2").trim();
  if (raw.endsWith("rem")) {
    const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize);
    return parseFloat(raw) * rootPx;
  }
  return parseFloat(raw) || 0;
}

export function teachPopupArrowPx(): number {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--cmd-teach-arrow-size")
    .trim();
  return parseFloat(raw) || 7;
}

export function teachPopupMaxWidthForLayout(): string | null {
  if (!MOBILE_TEACH_LAYOUT_MQ.matches) {
    return null;
  }
  return `${window.innerWidth * 0.8}px`;
}

export function positionFooterTeachPopup(popup: HTMLElement, btn: HTMLElement): void {
  const shell = el.gameShell.getBoundingClientRect();
  const btnRect = btn.getBoundingClientRect();
  const gap = teachPopupGapPx();
  const arrow = teachPopupArrowPx();
  const margin = 8;

  popup.style.position = "fixed";
  popup.style.inset = "auto";
  popup.style.right = "auto";
  popup.style.bottom = "auto";
  popup.style.transform = "none";
  popup.style.margin = "0";

  const layoutMaxWidth = teachPopupMaxWidthForLayout();
  if (layoutMaxWidth) {
    popup.style.maxWidth = layoutMaxWidth;
  } else {
    popup.style.maxWidth = "";
  }

  const width = popup.offsetWidth;
  let left: number;
  if (popup.classList.contains("cmd-teach-popup--align-end")) {
    left = btnRect.right - width;
  } else {
    left = btnRect.left;
  }
  left = Math.max(shell.left + margin, Math.min(left, shell.right - width - margin));

  popup.style.left = `${left}px`;
  popup.style.top = `${btnRect.bottom + gap}px`;

  void popup.offsetHeight;
  const popupRect = popup.getBoundingClientRect();
  const arrowTipY = popupRect.top - arrow;
  const nudge = btnRect.bottom - arrowTipY;
  if (Math.abs(nudge) > 0.5) {
    popup.style.top = `${popupRect.top + nudge}px`;
  }

  const viewportMargin = 8;
  const viewportTop = viewportMargin;
  const viewportBottom = window.innerHeight - popup.offsetHeight - viewportMargin;
  const currentTop = parseFloat(popup.style.top || "0");
  popup.style.top = `${Math.min(Math.max(currentTop, viewportTop), viewportBottom)}px`;

  const placed = popup.getBoundingClientRect();
  const btnCenterX = btnRect.left + btnRect.width / 2;
  if (popup.classList.contains("cmd-teach-popup--align-end")) {
    popup.style.setProperty(
      "--teach-arrow-offset-end",
      `${Math.max(0, placed.right - btnCenterX)}px`
    );
    popup.style.removeProperty("--teach-arrow-offset");
  } else {
    popup.style.setProperty(
      "--teach-arrow-offset",
      `${Math.max(0, btnCenterX - placed.left)}px`
    );
    popup.style.removeProperty("--teach-arrow-offset-end");
  }
}

export function syncCmdTeachPopup(
  popup: HTMLElement,
  btn: HTMLElement,
  popupId: CombatTeachPopupId,
  show: boolean
): void {
  if (!show) {
    gameState.temporarilyClosedTeachPopups.delete(popupId);
  }
  const visible = show && !gameState.temporarilyClosedTeachPopups.has(popupId);
  popup.classList.toggle("hidden", !visible);
  if (visible) {
    btn.setAttribute("aria-describedby", popupId);
    if (popup.classList.contains("cmd-teach-popup--dock-footer")) {
      requestAnimationFrame(() => {
        positionFooterTeachPopup(popup, btn);
        requestAnimationFrame(() => positionFooterTeachPopup(popup, btn));
      });
    }
  } else {
    btn.removeAttribute("aria-describedby");
    if (popup.classList.contains("cmd-teach-popup--dock-footer")) {
      clearFooterTeachPopupPosition(popup);
    }
  }
}

export function syncVisibleFooterTeachPopups(): void {
  if (!el.danceTeachPopup.classList.contains("hidden")) {
    positionFooterTeachPopup(el.danceTeachPopup, el.danceBtn);
  }
  if (!el.runTeachPopup.classList.contains("hidden")) {
    positionFooterTeachPopup(el.runTeachPopup, el.runBtn);
  }
}

// state.ts: gameState.footerTeachPopupResizeBound

export function bindFooterTeachPopupResize(): void {
  if (gameState.footerTeachPopupResizeBound) {
    return;
  }
  gameState.footerTeachPopupResizeBound = true;
  window.addEventListener("resize", syncVisibleFooterTeachPopups);
  el.gameShell.addEventListener("scroll", syncVisibleFooterTeachPopups);
}

export function syncCombatTeachPopups(
  showHeal: boolean,
  showDance: boolean,
  showRun: boolean
): void {
  const hasFoe = gameState.foe !== null;
  syncCmdTeachPopup(
    el.healTeachPopup,
    el.healBtn,
    "cmd-heal-teach",
    shouldShowHealTeachCopy(gameState.combatHints, showHeal, gameState.phase, hasFoe)
  );
  syncCmdTeachPopup(
    el.danceTeachPopup,
    el.danceBtn,
    "cmd-dance-teach",
    shouldShowDanceTeachCopy(gameState.combatHints, showDance, gameState.phase, hasFoe)
  );
  syncCmdTeachPopup(
    el.runTeachPopup,
    el.runBtn,
    "cmd-run-teach",
    shouldShowRunTeachCopy(gameState.combatHints, showRun, gameState.phase, hasFoe)
  );
}

const COMBAT_TEACH_POPUPS: readonly {
  id: CombatTeachPopupId;
  popup: HTMLElement;
}[] = [
  { id: "cmd-heal-teach", popup: el.healTeachPopup },
  { id: "cmd-dance-teach", popup: el.danceTeachPopup },
  { id: "cmd-run-teach", popup: el.runTeachPopup },
];

export function visibleCombatTeachPopups(): typeof COMBAT_TEACH_POPUPS {
  return COMBAT_TEACH_POPUPS.filter(({ popup }) => !popup.classList.contains("hidden"));
}

export function closeVisibleCombatTeachPopups(): void {
  const visiblePopups = visibleCombatTeachPopups();
  if (visiblePopups.length === 0) {
    return;
  }
  for (const { id } of visiblePopups) {
    gameState.temporarilyClosedTeachPopups.add(id);
  }
  syncCombatHintClasses();
}

export function isCombatCommandClick(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest("#actions [data-action]") !== null;
}

export function bindCombatTeachPopupDismissal(): void {
  document.addEventListener("click", (event) => {
    const visiblePopups = visibleCombatTeachPopups();
    if (visiblePopups.length === 0) {
      return;
    }
    const target = event.target;
    if (target instanceof Node && visiblePopups.some(({ popup }) => popup.contains(target))) {
      return;
    }
    // Hints can appear mid-handler when a command triggers a counter-attack; ignore that click.
    if (isCombatCommandClick(target)) {
      return;
    }
    closeVisibleCombatTeachPopups();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || visibleCombatTeachPopups().length === 0) {
      return;
    }
    event.preventDefault();
    closeVisibleCombatTeachPopups();
  });
}

export function briefClass(element: HTMLElement, className: string, ms: number): void {
  if (gameState.debugInstantTransitions) {
    return;
  }
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
  window.setTimeout(() => element.classList.remove(className), ms);
}

export function playStageClass(className: string, ms: number): Promise<void> {
  if (gameState.debugInstantTransitions) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    el.battleStage.classList.remove(className);
    void el.battleStage.offsetWidth;
    el.battleStage.classList.add(className);
    window.setTimeout(() => {
      el.battleStage.classList.remove(className);
      resolve();
    }, ms);
  });
}

export function clearCombatAnimations(): void {
  el.playerPanel.classList.remove(
    "hero-death",
    "hero-death-knockback",
    "hero-victory-wobble",
    "hero-heal",
    "hero-dance"
  );
  el.foePanel.classList.remove(
    "foe-poof",
    "foe-enter",
    "foe-dance",
    "foe-sprite-hidden"
  );
  clearHitReact(el.playerPanel);
  clearHitReact(el.foePanel);
  el.battleStage.classList.remove("stage-death-vignette", "stage-flash-gold");
}

export function clearHitReact(panel: HTMLElement): void {
  panel
    .querySelector(".emoji-stack")
    ?.classList.remove(
      "hero-took-hit",
      "hero-took-hit-fatal",
      "foe-took-hit",
      "foe-took-hit-fatal",
      "hero-lunge",
      "foe-lunge"
    );
  panel
    .querySelector(".hit-mark")
    ?.classList.remove("hit-mark-active", "hit-mark-active-kill");
}

export function playHeroHeal(): Promise<void> {
  if (gameState.debugInstantTransitions) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    el.playerPanel.classList.remove("hero-heal");
    void el.playerPanel.offsetWidth;
    el.playerPanel.classList.add("hero-heal");
    window.setTimeout(() => {
      el.playerPanel.classList.remove("hero-heal");
      resolve();
    }, HEAL_ANIM_MS);
  });
}

export function playHeroDance(): void {
  briefClass(el.playerPanel, "hero-dance", DANCE_ANIM_MS);
}

export function playFoeDance(): void {
  briefClass(el.foePanel, "foe-dance", DANCE_ANIM_MS);
}

export async function playRunExit(): Promise<void> {
  await playFoePoof();
}

export function playRunEntrance(): void {
  playFoeEntrance();
}

export function playFoeEntrance(): void {
  if (gameState.debugInstantTransitions) {
    return;
  }
  el.foePanel.classList.remove("foe-sprite-hidden");
  briefClass(el.foePanel, "foe-enter", FOE_ENTRANCE_MS);
}

export function playFoePoof(): Promise<void> {
  if (gameState.debugInstantTransitions) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    el.foePanel.classList.remove("foe-poof", "foe-sprite-hidden");
    void el.foePanel.offsetWidth;
    el.foePanel.classList.add("foe-poof");
    window.setTimeout(() => {
      el.foePanel.classList.remove("foe-poof");
      el.foePanel.classList.add("foe-sprite-hidden");
      resolve();
    }, FOE_POOF_MS);
  });
}

export async function playFoeDefeat(isFinal: boolean): Promise<void> {
  if (gameState.debugInstantTransitions) {
    return;
  }
  if (isFinal) {
    await Promise.all([playFoePoof(), playStageClass("stage-flash-gold", GOLD_FLASH_MS)]);
    briefClass(el.playerPanel, "hero-victory-wobble", 450);
    await pause(350);
    return;
  }
  await playFoePoof();
}

export async function handlePlayerDeath(): Promise<void> {
  await pause(420);
  el.playerPanel.classList.add("hero-death");
  await playStageClass("stage-death-vignette", DEATH_BEAT_MS);
  endGameHandler?.();
}

export function spritePopAnchor(side: "hero" | "foe"): { left: string; top: string } {
  const panel = side === "hero" ? el.playerPanel : el.foePanel;
  const stack = panel.querySelector<HTMLElement>(".sprite-wrap .emoji-stack");
  const layerRect = el.damageLayer.getBoundingClientRect();
  if (!stack || layerRect.width <= 0 || layerRect.height <= 0) {
    const fallbackLeft = side === "hero" ? 22 : 78;
    return { left: `${fallbackLeft}%`, top: "42%" };
  }
  const stackRect = stack.getBoundingClientRect();
  const centerX =
    ((stackRect.left + stackRect.width / 2 - layerRect.left) / layerRect.width) *
    100;
  const gapAbove = Math.max(32, stackRect.height * 0.78);
  const anchorY =
    ((stackRect.top - gapAbove - layerRect.top) / layerRect.height) * 100;
  return { left: `${centerX}%`, top: `${anchorY}%` };
}

export function showDamagePop(
  side: "hero" | "foe",
  text: string,
  kind: "damage" | "heal" | "hype",
  anchorOverride?: { left: string; top: string }
): void {
  const pop = document.createElement("span");
  pop.className =
    kind === "heal"
      ? "damage-pop heal-pop"
      : kind === "hype"
        ? "damage-pop hype-pop"
        : "damage-pop";
  pop.textContent = text;
  const anchor = anchorOverride ?? spritePopAnchor(side);
  pop.style.left = anchor.left;
  pop.style.top = anchor.top;
  el.damageLayer.appendChild(pop);
  void pop.offsetWidth;
  window.setTimeout(() => pop.remove(), 900);
}

export function playLevelUpNotice(level: number): Promise<void> {
  if (gameState.debugInstantTransitions) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const pop = document.createElement("span");
    pop.className = "level-up-pop";
    pop.textContent = `Level ${level}`;
    pop.setAttribute("role", "status");
    el.heroLevelUpLayer.setAttribute("aria-hidden", "false");
    el.heroLevelUpLayer.appendChild(pop);
    void pop.offsetWidth;
    window.setTimeout(() => {
      pop.remove();
      el.heroLevelUpLayer.setAttribute("aria-hidden", "true");
      resolve();
    }, LEVEL_UP_NOTICE_MS);
  });
}

export function renderHeroSprite(): void {
  el.playerEmoji.textContent = gameState.player.emoji;
  el.playerEmoji.setAttribute("aria-label", gameState.player.name);
  el.playerName.textContent = gameState.player.name.toUpperCase();
}

export function render(): void {
  renderRecords();
  applyHeroColorTheme(gameState.heroColorTheme);
  renderHeroSprite();
  el.waveBanner.textContent = `Wave ${Math.min(gameState.wave, getCampaignLength())} / ${getCampaignLength()}`;
  const inEndScreen = gameState.phase === "gameover" || gameState.phase === "victory";
  el.turnLabel.textContent = inEndScreen ? "-" : String(gameState.turn);
  const xp = xpProgressForDisplay(gameState.wave, gameState.phase);
  setHpBar(el.xpFill, xp.current, xp.max);
  el.xpText.textContent = `${xpPercentForDisplay(gameState.wave, gameState.phase)}%`;
  el.xpBar.setAttribute("aria-valuenow", String(xp.current));
  el.xpBar.setAttribute("aria-valuemax", String(xp.max));

  setHpBar(el.playerHpFill, gameState.player.hp, gameState.player.maxHp);
  el.playerHpText.textContent = `${gameState.player.hp}/${gameState.player.maxHp}`;
  el.playerLevel.textContent = String(playerLevelForWave(gameState.wave));
  el.playerAttack.textContent = String(getEffectiveAttack());
  renderHypeMeter(
    el.playerHypeWrap,
    el.playerStatus,
    el.playerHypeBar,
    el.playerHypeFill,
    el.playerBuff,
    gameState.hypeLevel,
    "player"
  );

  const playerHpBar = el.playerPanel.querySelector(".hp-bar");
  playerHpBar?.classList.toggle(
    "hp-low",
    canBeDefeatedByNextHit(gameState.player.hp, getEffectiveFoeAttack())
  );

  if (gameState.foe && !gameState.suppressFoePanelRender) {
    applyFoeColorTheme(gameState.foeColorTheme);
    el.foeName.textContent = gameState.foe.name.toUpperCase();
    el.foeLevel.textContent = String(gameState.foe.level);
    el.foeAttack.textContent = String(getEffectiveFoeAttack());
    renderHypeMeter(
      el.foeHypeWrap,
      el.foeStatus,
      el.foeHypeBar,
      el.foeHypeFill,
      el.foeBuff,
      gameState.foeHypeLevel,
      "foe"
    );
    el.foeEmoji.textContent = gameState.foe.emoji;
    el.foeEmoji.setAttribute("aria-label", gameState.foe.name);
    setHpBar(el.foeHpFill, gameState.foe.hp, gameState.foe.maxHp);
    el.foeHpText.textContent = `${gameState.foe.hp}/${gameState.foe.maxHp}`;
    const foeHpBar = el.foePanel.querySelector(".hp-bar");
    foeHpBar?.classList.toggle(
      "hp-low",
      canBeDefeatedByNextHit(gameState.foe.hp, getEffectiveAttack())
    );
  } else {
    el.foeStatus.classList.remove("hype-full");
  }

  if (gameState.phase !== "victory") {
    stopVictoryCelebration(el.victoryEmojiLayer);
  }
  el.gameOver.classList.toggle("hidden", !inEndScreen);
  el.gameOver.classList.toggle("game-victory", gameState.phase === "victory");
  el.gameOverTag.textContent = gameState.phase === "victory" ? "YOU WIN!" : "GAME OVER";
  el.restartLabel.textContent = gameState.phase === "victory" ? "Play Again?" : "Try Again?";
  el.gameOverLog.open = false;
  renderGameOverBattleLog();
  el.actions.classList.toggle("hidden", inEndScreen);
  syncFirstHypeFlashes();
  syncCombatHintClasses();
  gameState.suppressTeachFlashesThisRender = false;
}

export function rememberBattleLogEntry(
  lines: { text: string; kind: "info" | "player" | "foe" | "win" | "lose" }[],
  action?: BattleActionLabel,
  title?: string,
  turnOverride = gameState.turn
): void {
  gameState.battleLogHistory.push({
    title,
    waveTitle:
      title && title.startsWith("WAVE ")
        ? { wave: gameState.wave, attempt: gameState.waveAttempt }
        : undefined,
    wave: gameState.wave,
    turn: turnOverride,
    action,
    playerAttack: getEffectiveAttack(),
    playerPower: gameState.hypeLevel,
    foeAttack: gameState.foe ? getEffectiveFoeAttack() : null,
    foePower: gameState.foe ? gameState.foeHypeLevel : null,
    foeColorTheme: gameState.foeColorTheme,
    lines: lines.map((line) => ({ ...line })),
  });
}

export function resetBattleLogHistory(): void {
  gameState.battleLogHistory.length = 0;
}

export function renderGameOverBattleLog(): void {
  const waveAttemptCounts = new Map<number, number>();
  for (const entry of gameState.battleLogHistory) {
    if (!entry.waveTitle) continue;
    waveAttemptCounts.set(
      entry.waveTitle.wave,
      Math.max(waveAttemptCounts.get(entry.waveTitle.wave) ?? 0, entry.waveTitle.attempt)
    );
  }
  el.gameOverBattleLog.replaceChildren();
  for (const entry of gameState.battleLogHistory) {
    const item = document.createElement("li");
    item.className = entry.title
      ? "game-over-log-entry game-over-log-entry-title"
      : "game-over-log-entry";
    const colors = colorThemeSurfaces(getColorTheme(entry.foeColorTheme), gameState.currentColorMode);
    item.style.setProperty(
      "--entry-foe-text",
      gameState.currentColorMode === "dark" ? colors.accent : colors.plateText
    );
    if (entry.title) {
      const meta = document.createElement("div");
      meta.className = "game-over-log-meta";
      if (entry.waveTitle && (waveAttemptCounts.get(entry.waveTitle.wave) ?? 1) > 1) {
        meta.textContent = `WAVE ${entry.waveTitle.wave}.${entry.waveTitle.attempt}`;
      } else {
        meta.textContent = entry.title;
      }
      item.appendChild(meta);
      for (const line of entry.lines) {
        appendBattleLine(item, line.text, line.kind);
      }
      el.gameOverBattleLog.appendChild(item);
      continue;
    }
    if (entry.action) {
      appendBattleActionMeta(item, entry.turn, entry.action);
    }
    for (const line of entry.lines) {
      appendBattleLine(item, line.text, line.kind);
    }
    el.gameOverBattleLog.appendChild(item);
  }
}

export function logLine(
  text: string,
  kind: "info" | "player" | "foe" | "win" | "lose" = "info",
  action?: BattleActionLabel,
  turnOverride = gameState.turn,
  historyText = text
): void {
  rememberBattleLogEntry([{ text: historyText, kind }], action, undefined, turnOverride);
  el.battleText.textContent = text;
  el.battleText.className = `battle-text battle-${kind}`;
  revealBattleLog();
}

export function logWaveStart(): void {
  if (!gameState.foe) return;
  const title = `WAVE ${gameState.wave}`;
  const lines: BattleLogEntry["lines"] = [];
  if ((gameState.wave - 1) % WAVES_PER_LEVEL === 0) {
    lines.push({
      text: `LEVEL ${playerLevelForWave(gameState.wave)}: ${gameState.player.maxHp} HP · ATK ${getEffectiveAttack()}`,
      kind: "player",
    });
  }
  lines.push({
    text: `${gameState.foe.name} · ATK ${getEffectiveFoeAttack()} · HP ${gameState.foe.maxHp}`,
    kind: "foe",
  });
  rememberBattleLogEntry(
    lines,
    undefined,
    title
  );
}

export function logEndTitle(text: string): void {
  rememberBattleLogEntry([], undefined, text);
}

export function levelUpStatsText(): string {
  return `LEVEL UP · ATK ${getEffectiveAttack()} · HP ${gameState.player.maxHp}`;
}

export function logBattleLines(
  primary: { text: string; kind: "info" | "player" | "foe" | "win" | "lose" },
  secondary: { text: string; kind: "info" | "player" | "foe" | "win" | "lose" },
  action?: BattleActionLabel,
  turnOverride = gameState.turn
): void {
  rememberBattleLogEntry([primary, secondary], action, undefined, turnOverride);
  setBattleLines(el.battleText, [primary, secondary]);
  revealBattleLog();
}

export function appendDanceHypeSuffix(line: string, suffix: string): string {
  return suffix ? `${line} ${suffix}` : line;
}

export function danceHypeSuffix(gain: number, capped: boolean): string {
  if (gain > 0) {
    return `+${gain} HYPE`;
  }
  if (capped) {
    return "MAX HYPE";
  }
  return "";
}

export function logDanceLines(
  opener: string,
  reaction: string,
  opts: {
    playerGain: number;
    foeGain: number;
    playerCapped: boolean;
    foeCapped: boolean;
    turnOverride?: number;
  }
): void {
  const lines: { text: string; kind: "info" | "player" | "foe" | "win" | "lose" }[] = [
    {
      text: appendDanceHypeSuffix(opener, danceHypeSuffix(opts.playerGain, opts.playerCapped)),
      kind: "player",
    },
    {
      text: appendDanceHypeSuffix(reaction, danceHypeSuffix(opts.foeGain, opts.foeCapped)),
      kind: "foe",
    },
  ];
  rememberBattleLogEntry(lines, "Dance", undefined, opts.turnOverride ?? gameState.turn);
  setBattleLines(el.battleText, lines);
  revealBattleLog();
}

export function revealBattleLog(): void {
  el.battleText.closest(".dialog-box")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

export function pause(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function clearLog(): void {
  resetBattleLogHistory();
  el.battleText.textContent = "What will you do?";
  el.battleText.className = "battle-text battle-info";
}
