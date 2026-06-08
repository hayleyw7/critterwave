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

export function getCampaignLength(): number {
  return CAMPAIGN_WAVES;
}

export function getHealMax(): number {
  return playerStatsForWave(gameState.wave).healMax;
}


export function getPlayerHypeBonus(): number {
  return clampHype(gameState.hypeLevel) * HYPE_ATTACK_PER_LEVEL;
}

export function getFoeHypeBonus(): number {
  return clampHype(gameState.foeHypeLevel) * HYPE_ATTACK_PER_LEVEL;
}

export function getEffectiveAttack(): number {
  return gameState.player.attack + getPlayerHypeBonus();
}

export function getEffectiveFoeAttack(): number {
  if (!gameState.foe) return 0;
  return gameState.foe.attack + getFoeHypeBonus();
}
