import { setBattleLines } from "../lib/battle-log-dom.js";
import { blockCombatForScreenEnd } from "../lib/combat-gate.js";
import { attackTeachText } from "../lib/combat-hints.js";
import { HERO_PICKER_ORDER, heroPickerEmojisForViewport, isMobileHeroPickerViewport, measureHeroPickerColumnCount, resolveHeroPickerEmoji, trimHeroPickerEmojisToFullRows, estimateHeroPickerColumnCount } from "../lib/hero-groups.js";
import { isDebugHost } from "../lib/save-validation.js";
import { startVictoryCelebration, stopVictoryCelebration } from "../ui/victory-celebration.js";
import { bindHelpDialog, restoreHelpDialog } from "./app-help.js";
import {
  clearLog,
  logEndTitle,
  logWaveStart,
  revealBattleLog,
} from "./battle-log.js";
import { resetGame, endGame, winCampaign, gameOverSummaryText, onAttack, onHeal, onDance, onRun, canUseCombatActions, applyCombatGateState, combatGateState } from "./combat.js";
import { applyHeroColorTheme } from "./colors.js";
import { CAMPAIGN_WAVES, SKIP_EXIT_FLUSH_KEY, STORAGE_KEY } from "./constants.js";
import { FOES, HEROES } from "./data.js";
import { el } from "./dom.js";
import { persist, persistStatsOnly, persistSetupDraft, loadSave, loadSnapshot, applySnapshot, setConfirmActions, bindConfirmDialog, bindPageExitPersist, restorePendingConfirmIfNeeded, withSaveMeta, presentConfirm } from "./persistence.js";
import { migrateLegacyStorageKey } from "./save-io.js";
import { resolveHeroColorTheme, resolveSavedHeroName, getHeroLabelForEmoji, readHeroNameFromSetup } from "./hero-setup.js";
import { initColorMode, toggleColorMode, renderRecords } from "./theme.js";
import {
  closeFooterDropdowns,
  initAudioFromSave,
  sfxUiClick,
  syncBgmForPhase,
  cycleMusicLevel,
  cycleSfxLevel,
  unlockAudio,
} from "./audio.js";
import { render } from "./presentation.js";
import {
  bindSetupColorPicker,
  buildHeroColorSwatches,
  closeHeroColorPopup,
  getSetupBlockers,
  readHeroColorThemeFromSetup,
  showSetupBlockedHint,
  updateSetupStartButton,
} from "./setup-ui.js";
import { gameState } from "./state.js";
import { getCampaignLength } from "./stats.js";
import { bindCombatTeachPopupDismissal, bindFooterTeachPopupResize } from "./teach-popups.js";
import { type DebugCombatAction } from "./types.js";

export function hasDebugWin(): boolean {
  return (
    isDebugHost(window.location.hostname) &&
    new URLSearchParams(window.location.search).get("debug") === "win"
  );
}
export function ensureDebugHeroChoice(): void {
  if (gameState.player.emoji) {
    return;
  }
  const first = HEROES[0]!;
  applyHeroChoice(first.emoji, first.label);
  applyHeroColorTheme(resolveHeroColorTheme(loadSave()));
}

export function waitForDebugTick(): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, 0));
}

export function performDebugCombatAction(action: DebugCombatAction): void {
  switch (action) {
    case "heal":
      onHeal();
      return;
    case "dance":
      onDance();
      return;
    case "run":
      onRun();
      return;
    default:
      onAttack();
  }
}

export function scriptedDebugAction(
  actions: readonly DebugCombatAction[],
  index: number,
  campaignLength: number
): { action: DebugCombatAction; nextIndex: number } {
  if (index >= actions.length) {
    return { action: "attack", nextIndex: index };
  }
  const candidate = actions[index]!;
  if (candidate === "run" && gameState.wave >= campaignLength) {
    return { action: "attack", nextIndex: index + 1 };
  }
  return { action: candidate, nextIndex: index + 1 };
}

export function tuneDebugLoseLogFoe(): void {
  if (!gameState.foe) {
    return;
  }
  if (gameState.foe.maxHp < 60) {
    gameState.foe.maxHp = 60;
    gameState.foe.hp = Math.max(gameState.foe.hp, 60);
  }
  gameState.foe.attack = Math.max(gameState.foe.attack, 12);
}

export function triggerDebugWin(): void {
  hideSetup();
  ensureDebugHeroChoice();

  gameState.wave = getCampaignLength();
  clearLog();
  winCampaign();
}

export async function triggerDebugWinLog(): Promise<void> {
  hideSetup();
  ensureDebugHeroChoice();

  gameState.debugInstantTransitions = true;
  try {
    const campaignLength = getCampaignLength();
    const scriptedActions: readonly DebugCombatAction[] = [
      "dance",
      "heal",
      "attack",
      "run",
      "dance",
      "attack",
      "heal",
      "attack",
    ];
    let scriptedActionIndex = 0;
    resetGame();
    gameState.player.hp = 9999;
    gameState.player.maxHp = 9999;
    gameState.player.attack = 9999;
    render();
    persist();

    while (gameState.phase === "combat") {
      if (!gameState.foe) {
        await waitForDebugTick();
        continue;
      }
      if (!canUseCombatActions()) {
        await waitForDebugTick();
        continue;
      }
      gameState.player.attack = 9999;
      const scripted = scriptedDebugAction(
        scriptedActions,
        scriptedActionIndex,
        campaignLength
      );
      scriptedActionIndex = scripted.nextIndex;
      let action = scripted.action;
      if (
        action === "attack" &&
        gameState.wave < campaignLength &&
        gameState.waveAttempt === 1 &&
        gameState.turn === 1
      ) {
        if (gameState.wave % 33 === 0) {
          action = "run";
        } else if (gameState.wave % 19 === 0) {
          action = "heal";
        } else if (gameState.wave % 12 === 0) {
          action = "dance";
        }
      }
      performDebugCombatAction(action);
      await waitForDebugTick();
    }
  } finally {
    gameState.debugInstantTransitions = false;
  }
}

export function triggerDebugLose(): void {
  console.info("[critterwave] debug lose fired");
  hideSetup();
  ensureDebugHeroChoice();
  resetGame();
  gameState.player.hp = 0;
  endGame();
}

export async function triggerDebugLoseLog(): Promise<void> {
  hideSetup();
  ensureDebugHeroChoice();

  gameState.debugInstantTransitions = true;
  try {
    const campaignLength = getCampaignLength();
    const scriptedActions: readonly DebugCombatAction[] = [
      "dance",
      "heal",
      "run",
      "dance",
      "heal",
      "attack",
    ];
    let scriptedActionIndex = 0;
    resetGame();
    gameState.player.hp = 40;
    gameState.player.maxHp = 40;
    gameState.player.attack = 1;
    tuneDebugLoseLogFoe();
    render();
    persist();

    while (gameState.phase === "combat") {
      if (!gameState.foe) {
        await waitForDebugTick();
        continue;
      }
      if (!canUseCombatActions()) {
        await waitForDebugTick();
        continue;
      }
      tuneDebugLoseLogFoe();
      const scripted = scriptedDebugAction(
        scriptedActions,
        scriptedActionIndex,
        campaignLength
      );
      scriptedActionIndex = scripted.nextIndex;
      performDebugCombatAction(scripted.action);
      await waitForDebugTick();
    }
  } finally {
    gameState.debugInstantTransitions = false;
  }
}

export function mountDebugHooks(): boolean {
  if (!isDebugHost(window.location.hostname)) {
    return false;
  }

  const debugMode = new URLSearchParams(window.location.search).get("debug");

  if (debugMode === "lose") {
    triggerDebugLose();
    return true;
  }

  if (debugMode === "lose-log") {
    window.critterwave = {
      win: triggerDebugWin,
      lose: triggerDebugLose,
      winLog: triggerDebugWinLog,
      loseLog: triggerDebugLoseLog,
    };
    window.setTimeout(() => {
      void triggerDebugLoseLog();
    }, 0);
    console.info(
      "[critterwave] Debug: simulated lose log — or load with ?debug=lose-log"
    );

    return true;
  }

  if (debugMode === "win") {
    window.critterwave = {
      win: triggerDebugWin,
      lose: triggerDebugLose,
      winLog: triggerDebugWinLog,
      loseLog: triggerDebugLoseLog,
    };
    console.info(
      "[critterwave] Debug: critterwave.win() / lose() / winLog() / loseLog() — or load with ?debug=win|win-log|lose|lose-log"
    );
    return false;
  }

  if (debugMode === "win-log") {
    window.critterwave = {
      win: triggerDebugWin,
      lose: triggerDebugLose,
      winLog: triggerDebugWinLog,
      loseLog: triggerDebugLoseLog,
    };
    window.setTimeout(() => {
      void triggerDebugWinLog();
    }, 0);
    console.info(
      "[critterwave] Debug: simulated win log — or load with ?debug=win-log"
    );
    return true;
  }

  return false;
}

export function maybeRunDebugWin(): void {
  if (!hasDebugWin()) {
    return;
  }

  triggerDebugWin();
}

export function applyHeroChoice(emoji: string, label: string): void {
  gameState.player.emoji = emoji;
  gameState.player.name = label;
  gameState.pendingHeroEmoji = emoji;
  gameState.pendingHeroLabel = label;
}

export function resolvePickerHeroEmoji(emoji: string): string {
  const mobile = isMobileHeroPickerViewport();
  const remPx =
    typeof window !== "undefined"
      ? parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      : 16;
  const columns = estimateHeroPickerColumnCount(
    getHeroPickerContainerWidth(),
    remPx
  );
  return resolveHeroPickerEmoji(emoji, HERO_PICKER_ORDER, mobile, columns);
}

function getHeroPickerContainerWidth(): number {
  const width = el.heroPicker.clientWidth;
  if (width > 0) {
    return width;
  }
  if (typeof window === "undefined") {
    return 0;
  }
  const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const panelWidth = Math.min(window.innerWidth - 2 * 1.25 * remPx, 720);
  return panelWidth - 2 * 1.25 * remPx;
}

function trimHeroPickerGridToFullRows(
  grid: HTMLElement,
  candidates: readonly string[],
  columns: number
): string[] {
  const trimmed = trimHeroPickerEmojisToFullRows(candidates, columns);
  const trimmedSet = new Set(trimmed);
  for (const btn of [...grid.querySelectorAll<HTMLButtonElement>(".emoji-pick")]) {
    if (!trimmedSet.has(btn.dataset.emoji ?? "")) {
      btn.remove();
    }
  }
  return trimmed;
}

function heroPickerHasPartialRow(grid: HTMLElement): boolean {
  const count = grid.querySelectorAll(".emoji-pick").length;
  if (count === 0) {
    return false;
  }
  const columns = measureHeroPickerColumnCount(grid);
  return count % columns !== 0;
}

function syncPendingHeroAfterPickerTrim(trimmed: readonly string[]): void {
  if (trimmed.includes(gameState.pendingHeroEmoji)) {
    return;
  }
  const next = trimmed[0];
  if (!next) {
    return;
  }
  gameState.pendingHeroEmoji = next;
  gameState.pendingHeroLabel = getHeroLabelForEmoji(next);
  for (const btn of el.heroPicker.querySelectorAll<HTMLButtonElement>(".emoji-pick")) {
    btn.classList.toggle("selected", btn.dataset.emoji === next);
  }
}

let heroPickerViewportListener: (() => void) | null = null;

function bindHeroPickerViewportListener(): void {
  if (heroPickerViewportListener || typeof window === "undefined") {
    return;
  }
  heroPickerViewportListener = () => {
    if (!el.gameShell.classList.contains("setup-active")) {
      return;
    }
    buildHeroPicker();
  };
  window.addEventListener("resize", heroPickerViewportListener);
}

function unbindHeroPickerViewportListener(): void {
  if (!heroPickerViewportListener || typeof window === "undefined") {
    return;
  }
  window.removeEventListener("resize", heroPickerViewportListener);
  heroPickerViewportListener = null;
}

export function buildHeroPicker(): void {
  el.heroPicker.replaceChildren();

  const grid = document.createElement("div");
  grid.className = "emoji-picker-grid";
  const mobile = isMobileHeroPickerViewport();
  const candidates = heroPickerEmojisForViewport(HERO_PICKER_ORDER, mobile);

  el.heroPicker.appendChild(grid);
  void grid.offsetHeight;
  const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  let columns = measureHeroPickerColumnCount(grid);
  if (columns <= 1 && grid.clientWidth > 0) {
    columns = estimateHeroPickerColumnCount(grid.clientWidth, remPx);
  }
  let trimmed = trimHeroPickerEmojisToFullRows(candidates, columns);
  const trimmedSet = new Set(trimmed);

  for (const hero of HEROES) {
    if (!trimmedSet.has(hero.emoji)) {
      continue;
    }
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "emoji-pick";
    btn.dataset.emoji = hero.emoji;
    btn.dataset.label = hero.label;
    btn.setAttribute("aria-label", hero.label);
    const glyph = document.createElement("span");
    glyph.className = "emoji-pick-glyph";
    glyph.setAttribute("aria-hidden", "true");
    glyph.textContent = hero.emoji;
    btn.appendChild(glyph);
    if (hero.emoji === gameState.pendingHeroEmoji) {
      btn.classList.add("selected");
    }
    btn.addEventListener("click", () => {
      for (const other of el.heroPicker.querySelectorAll(".emoji-pick")) {
        other.classList.remove("selected");
      }
      btn.classList.add("selected");
        gameState.pendingHeroEmoji = hero.emoji;
        gameState.pendingHeroLabel = hero.label;
        updateSetupStartButton();
        persistSetupDraft();
      });
      grid.appendChild(btn);
  }

  syncPendingHeroAfterPickerTrim(trimmed);

  requestAnimationFrame(() => {
    if (!grid.isConnected || !el.gameShell.classList.contains("setup-active")) {
      return;
    }
    if (!heroPickerHasPartialRow(grid)) {
      return;
    }
    const actualColumns = measureHeroPickerColumnCount(grid);
    trimmed = trimHeroPickerGridToFullRows(grid, candidates, actualColumns);
    syncPendingHeroAfterPickerTrim(trimmed);
  });
}

export function updateSetupSubtitle(): void {
  el.setupSubtitle.textContent = attackTeachText(CAMPAIGN_WAVES);
}

export function showSetup(): void {
  syncBgmForPhase("setup");
  const save = loadSave();
  closeHeroColorPopup();
  gameState.pendingHeroEmoji = resolvePickerHeroEmoji(save.playerEmoji ?? gameState.player.emoji);
  gameState.pendingHeroLabel = getHeroLabelForEmoji(gameState.pendingHeroEmoji);
  gameState.setupHintForced = false;
  updateSetupSubtitle();
  buildHeroPicker();
  bindHeroPickerViewportListener();
  el.heroNameInput.value = save.heroName ?? "";
  gameState.pendingHeroColorTheme = resolveHeroColorTheme(save);
  buildHeroColorSwatches(persistSetupDraft);
  applyHeroColorTheme(gameState.pendingHeroColorTheme);
  updateSetupStartButton();
  el.setupOverlay.classList.remove("hidden");
  el.gameShell.classList.add("setup-active");
  persistSetupDraft();
}

export function hideSetup(): void {
  closeHeroColorPopup();
  unbindHeroPickerViewportListener();
  el.setupOverlay.classList.add("hidden");
  el.gameShell.classList.remove("setup-active");
}

export function confirmHeroAndStart(): boolean {
  const blockers = getSetupBlockers();
  if (blockers.length > 0) {
    showSetupBlockedHint();
    return false;
  }
  const heroName = readHeroNameFromSetup();
  if (!heroName) {
    showSetupBlockedHint();
    return false;
  }
  applyHeroChoice(gameState.pendingHeroEmoji, heroName);
  applyHeroColorTheme(readHeroColorThemeFromSetup());
  hideSetup();
  persistStatsOnly();
  if (gameState.foe) {
    resetGame();
  }
  return true;
}


export function applyNewRun(): void {
  persistStatsOnly();
  gameState.foe = null;
  gameState.phase = "combat";
  stopVictoryCelebration(el.victoryEmojiLayer);
  el.gameOver.classList.add("hidden");
  showSetup();
}

export function applyClearData(): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(withSaveMeta({ bestWave: 0, runsPlayed: 0 }))
  );
  renderRecords();
  gameState.foe = null;
  gameState.phase = "combat";
  stopVictoryCelebration(el.victoryEmojiLayer);
  el.gameOver.classList.add("hidden");
  showSetup();
}

export async function startNewGame(): Promise<void> {
  await presentConfirm("newRun", applyNewRun);
}

export async function resetStats(): Promise<void> {
  await presentConfirm("clearData", applyClearData);
}

export function bindActions(): void {
  let unlockAttempt: Promise<boolean> | null = null;
  const removeAudioUnlockListeners = () => {
    document.removeEventListener("pointerdown", unlockOnFirstInteraction, true);
    document.removeEventListener("click", unlockOnFirstInteraction, true);
    document.removeEventListener("keydown", unlockOnFirstInteraction, true);
  };
  const unlockOnFirstInteraction = () => {
    if (unlockAttempt) {
      return;
    }
    unlockAttempt = unlockAudio();
    void unlockAttempt.then((didUnlock) => {
      unlockAttempt = null;
      if (didUnlock) {
        removeAudioUnlockListeners();
      }
    });
  };
  document.addEventListener("pointerdown", unlockOnFirstInteraction, {
    capture: true,
  });
  document.addEventListener("click", unlockOnFirstInteraction, { capture: true });
  document.addEventListener("keydown", unlockOnFirstInteraction, {
    capture: true,
  });

  el.actions.addEventListener("click", (event) => {
    void unlockAudio();
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-action]");
    if (!target) return;

    const action = target.dataset.action;
    if (!canUseCombatActions()) return;

    sfxUiClick();
    switch (action) {
      case "attack":
        onAttack();
        break;
      case "heal":
        onHeal();
        break;
      case "dance":
        onDance();
        break;
      case "run":
        onRun();
        break;
    }
    target.blur();
  });

  el.restartBtn.addEventListener("click", () => {
    resetGame();
  });

  el.quitBtn.addEventListener("click", () => {
    void startNewGame();
  });

  el.resetStatsBtn.addEventListener("click", () => {
    void resetStats();
  });

  el.themeToggle.addEventListener("click", () => {
    toggleColorMode();
  });

  el.musicLevelBtn.addEventListener("click", () => {
    void unlockAudio();
    cycleMusicLevel();
  });

  el.sfxLevelBtn.addEventListener("click", () => {
    void unlockAudio();
    cycleSfxLevel();
  });

  el.heroNameInput.addEventListener("input", () => {
    updateSetupStartButton();
    persistSetupDraft();
  });
  bindSetupColorPicker();

  el.setupStartBtn.addEventListener("click", () => {
    void (async () => {
      await unlockAudio();
      if (!confirmHeroAndStart()) {
        return;
      }
      if (!gameState.foe) {
        await beginGame();
      } else {
        render();
        persist();
      }
    })();
  });
}

export function closeFooterMore(): void {
  closeFooterDropdowns();
}

export function bindFooterMoreMenu(): void {
  el.footerMore.addEventListener("toggle", () => {
    if (el.footerMore.open) {
      el.footerSound.open = false;
    }
  });

  el.footerSound.addEventListener("toggle", () => {
    if (el.footerSound.open) {
      el.footerMore.open = false;
    }
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }
    if (el.footerMore.open && !el.footerMore.contains(target)) {
      el.footerMore.open = false;
    }
    if (el.footerSound.open && !el.footerSound.contains(target)) {
      el.footerSound.open = false;
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }
    if (!el.footerMore.open && !el.footerSound.open) {
      return;
    }
    event.preventDefault();
    closeFooterDropdowns();
  });
}

export async function beginGame(): Promise<void> {
  const save = loadSave();
  if (save.playerEmoji) {
    applyHeroChoice(
      save.playerEmoji,
      resolveSavedHeroName(save, save.playerEmoji)
    );
  }

  const snapshot = loadSnapshot();
  if (snapshot && snapshot.phase === "combat" && snapshot.foe) {
    applySnapshot(snapshot);
    if (gameState.battleLogHistory.length === 0) {
      logWaveStart();
    }
    setBattleLines(el.battleText, [
      { text: "Welcome back — your run was restored.", kind: "info" },
      {
        text: `It's your turn against ${gameState.foe!.name}!`,
        kind: "player",
      },
    ]);
    revealBattleLog();
    render();
    persist();
    syncBgmForPhase("combat");
    return;
  }

  if (snapshot?.phase === "gameover" || snapshot?.phase === "victory") {
    applySnapshot(snapshot);
    applyCombatGateState(blockCombatForScreenEnd(combatGateState()));
    if (snapshot.phase === "victory") {
      if (gameState.battleLogHistory.length === 0) {
        logEndTitle(`Wave ${CAMPAIGN_WAVES} cleared! Total victory!`);
      }
      startVictoryCelebration(
        el.victoryEmojiLayer,
        FOES.map((f) => f.emoji),
        gameState.player.emoji
      );
      el.gameOverSummary.textContent = `All ${CAMPAIGN_WAVES} waves cleared. Critterwave legend.`;
    } else {
      if (gameState.battleLogHistory.length === 0) {
        logEndTitle("GAME OVER");
      }
      el.gameOverSummary.textContent = gameOverSummaryText(snapshot.wave);
    }
    syncBgmForPhase(snapshot.phase);
    render();
    return;
  }

  resetGame();
}

export function finishBoot(): void {
  requestAnimationFrame(() => {
    document.body.classList.remove("is-booting");
  });
}

export async function init(): Promise<void> {
  migrateLegacyStorageKey();
  setConfirmActions({
    newRun: applyNewRun,
    clearData: applyClearData,
  });
  try {
    sessionStorage.removeItem(SKIP_EXIT_FLUSH_KEY);
  } catch {
    /* sessionStorage unavailable */
  }

  initColorMode();
  const save = loadSave();
  initAudioFromSave({
    musicLevel: save.musicLevel,
    sfxLevel: save.sfxLevel,
    musicMuted: save.musicMuted,
    sfxMuted: save.sfxMuted,
    soundMuted: save.soundMuted,
  });
  updateSetupSubtitle();
  bindConfirmDialog();
  bindHelpDialog();
  bindFooterMoreMenu();
  bindCombatTeachPopupDismissal();
  bindActions();
  bindPageExitPersist();
  bindFooterTeachPopupResize();
  renderRecords();
  restoreHelpDialog();

  const handledDebug = mountDebugHooks();
  if (handledDebug) {
    finishBoot();
    return;
  }

  if (save.setupActive) {
    showSetup();
    finishBoot();
    restorePendingConfirmIfNeeded();
    maybeRunDebugWin();
    return;
  }

  if (!save.playerEmoji) {
    showSetup();
    finishBoot();
    restorePendingConfirmIfNeeded();
    maybeRunDebugWin();
    return;
  }

  applyHeroChoice(
    save.playerEmoji,
    resolveSavedHeroName(save, save.playerEmoji)
  );
  applyHeroColorTheme(resolveHeroColorTheme(save));
  void beginGame();
  finishBoot();
  restorePendingConfirmIfNeeded();
  maybeRunDebugWin();
}
