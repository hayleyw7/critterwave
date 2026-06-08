import { applyColorMode, parseColorMode, runColorModeTransition } from "../lib/color-mode.js";
import {
  formatFoeInText as formatFoeMessage,
  playerLevelForWave,
  xpProgressForDisplay,
  xpPercentForDisplay,
} from "../lib/game-logic.js";
import { stopVictoryCelebration } from "../ui/victory-celebration.js";
import { renderGameOverBattleLog } from "./battle-log.js";
import { applyFoeColorTheme, applyHeroColorTheme } from "./colors.js";
import { el } from "./dom.js";
import { syncFirstHypeFlashes, renderHypeMeter } from "./hype-ui.js";
import { loadSave as loadSaveFromStorage, readPersistedFields, withSaveMeta as withSaveMetaForMode, writeSaveJson } from "./save-io.js";
import { gameState } from "./state.js";
import { getCampaignLength, getEffectiveAttack, getEffectiveFoeAttack } from "./stats.js";
import { syncCombatHintClasses } from "./teach-popups.js";
import { setHpBar } from "./ui-bars.js";

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
  el.footerMore.open = false;
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

export function foeDisplayName(): string {
  return gameState.foe?.name ?? "foe";
}

export function formatFoeInText(template: string): string {
  return formatFoeMessage(template, foeDisplayName());
}

export function renderRecords(): void {
  const save = loadSaveFromStorage(gameState.currentColorMode);
  el.bestWave.textContent = String(save.bestWave);
  el.runs.textContent = String(save.runsPlayed);
}

export function canBeDefeatedByNextHit(hp: number, incomingAttack: number): boolean {
  return hp > 0 && incomingAttack >= hp;
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

// Re-export slices so existing imports from presentation.js keep working.
export {
  appendDanceHypeSuffix,
  clearLog,
  danceHypeSuffix,
  levelUpStatsText,
  logBattleLines,
  logDanceLines,
  logEndTitle,
  logLine,
  logWaveStart,
  rememberBattleLogEntry,
  renderGameOverBattleLog,
  resetBattleLogHistory,
  revealBattleLog,
} from "./battle-log.js";
export {
  briefClass,
  clearCombatAnimations,
  clearHitReact,
  handlePlayerDeath,
  pause,
  playFoeDefeat,
  playFoeDance,
  playFoeEntrance,
  playFoePoof,
  playHeroDance,
  playHeroHeal,
  playLevelUpNotice,
  playRunEntrance,
  playRunExit,
  playStageClass,
  playXpBarFullBeat,
  showDamagePop,
  spritePopAnchor,
} from "./animations.js";
export {
  applyFoeDanceBuff,
  applyFoeHitHypeLoss,
  applyPlayerDanceBuff,
  applyPlayerHitHypeLoss,
  clearAllHype,
  playFirstAttackFoeHpFlash,
  playFirstHealHpFlash,
  playFirstPlayerDamageHpFlash,
  playFirstWaveVictoryHealHpFlash,
  syncFirstHypeFlashes,
} from "./hype-ui.js";
export {
  bindCombatTeachPopupDismissal,
  bindFooterTeachPopupResize,
  syncCombatHintClasses,
} from "./teach-popups.js";
export {
  bindSetupColorPicker,
  buildHeroColorSwatches,
  closeHeroColorPopup,
  getSetupBlockers,
  readHeroColorThemeFromSetup,
  showSetupBlockedHint,
  updateSetupStartButton,
} from "./setup-ui.js";
export { setHpBar } from "./ui-bars.js";
