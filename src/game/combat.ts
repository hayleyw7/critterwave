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
import { buildFoeOrder, restoreFoeOrder, spawnFoeFromQueue, syncPlayerForCurrentWave } from "./foe-queue.js";
import {
  render,
  syncCombatHintClasses,
  playFirstHealHpFlash,
  playFirstPlayerDamageHpFlash,
  playFirstAttackFoeHpFlash,
  playFirstWaveVictoryHealHpFlash,
  playHeroHeal,
  playHeroDance,
  playFoeDance,
  playRunExit,
  playFoeEntrance,
  playFoePoof,
  playFoeDefeat,
  handlePlayerDeath,
  showDamagePop,
  briefClass,
  clearCombatAnimations,
  clearHitReact,
  playLevelUpNotice,
  pause,
  logLine,
  logBattleLines,
  logDanceLines,
  logWaveStart,
  logEndTitle,
  clearLog,
  revealBattleLog,
  applyFoeColorTheme,
  pickNextFoeColor,
  playXpBarFullBeat,
  clearAllHype,
  applyPlayerDanceBuff,
  applyFoeDanceBuff,
  applyPlayerHitHypeLoss,
  applyFoeHitHypeLoss,
  formatFoeInText,
} from "./presentation.js";
import { persist, getSnapshot, loadSave, withSaveMeta } from "./persistence.js";

export function combatGateState(): CombatGateState {
  return {
    phase: gameState.phase,
    combatBusy: gameState.combatBusy,
    awaitingFoeResponse: gameState.awaitingFoeResponse,
    combatActionGeneration: gameState.combatActionGeneration,
    playerHp: gameState.player.hp,
    hasFoe: gameState.foe !== null,
  };
}

export function applyCombatGateState(state: CombatGateState): void {
  gameState.combatBusy = state.combatBusy;
  gameState.awaitingFoeResponse = state.awaitingFoeResponse;
  gameState.combatActionGeneration = state.combatActionGeneration;
}

export function canUseCombatActions(): boolean {
  return canUseCombatActionsGate(combatGateState());
}

/** Returns action generation id when locked; null if actions are not allowed. */
export function lockCombat(): number | null {
  const locked = tryLockCombatGate(combatGateState());
  if (!locked.ok) {
    return null;
  }
  applyCombatGateState(locked.state);
  return locked.generation;
}

export function finishCombatAction(generation: number): void {
  applyCombatGateState(finishCombatActionGate(generation, combatGateState()));
  syncCombatHintClasses();
}

export function playNextFoeReveal(
  primary: { text: string; kind: "player" },
  secondary: { text: string; kind: "foe" }
): void {
  applyFoeColorTheme(gameState.foeColorTheme);
  setBattleLines(el.battleText, [primary, secondary]);
  revealBattleLog();
  render();
  playFoeEntrance();
}

export async function transitionToNextWave(
  previousFoeName: string,
  transition: "flee" | "defeat",
  entrance: "run" | "foe" = "foe",
  exitAnimPromise?: Promise<void>,
  knownDefeatVerb?: string,
  knownDefeatText?: string
): Promise<void> {
  const defeatVerb =
    transition === "defeat" ? (knownDefeatVerb ?? nextDefeatVerb()) : undefined;
  const fleeWithExitAnim = exitAnimPromise !== undefined;
  const fledId = gameState.foe?.id;

  if (fleeWithExitAnim) {
    logLine(
      `You run away from ${previousFoeName},`,
      "player",
      "Run",
      gameState.turn,
      `You run away from ${previousFoeName}.`
    );
  } else if (!(transition === "defeat" && knownDefeatVerb)) {
    const actionText =
      transition === "flee"
        ? `You run away from ${previousFoeName},`
        : `You ${defeatVerb} ${previousFoeName},`;

    logLine(
      actionText,
      "player",
      transition === "flee" ? "Run" : "Attack",
      gameState.turn,
      transition === "flee" ? `You run away from ${previousFoeName}.` : actionText
    );
  }

  gameState.turn = 1;
  pickNextFoeColor();
  let flashWaveVictoryHealHp = false;

  if (transition === "defeat") {
    const completedWave = gameState.wave;
    const isLevelBandFinaleWave = isLevelBandFinale(
      completedWave,
      getCampaignLength()
    );
    if (isLevelBandFinaleWave) {
      await playXpBarFullBeat();
    }

    gameState.wave += 1;
    gameState.waveAttempt = 1;
    const levelBefore = playerLevelForWave(gameState.wave - 1);
    const hpBeforeHeal = gameState.player.hp;
    const maxHpBeforeHeal = gameState.player.maxHp;
    const advanced = advanceFoeQueueAfterVictory(
      gameState.foeQueue,
      gameState.deferredFoeIds,
      gameState.foeOrder,
      gameState.wave
    );
    gameState.foeQueue = advanced.queue;
    gameState.deferredFoeIds = advanced.deferred;

    const playerLevel = syncPlayerForCurrentWave({
      grantMaxHpIncrease: true,
      healToMax: playerLevelForWave(gameState.wave) > levelBefore,
    });

    if (playerLevel <= levelBefore) {
      applyWaveVictoryHeal();
    }

    const waveHealFlash = tryCelebrateFirstWaveVictoryHeal(
      gameState.combatHints,
      completedWave,
      hpBeforeHeal,
      gameState.player.hp
    );
    gameState.combatHints = waveHealFlash.flags;
    flashWaveVictoryHealHp = waveHealFlash.flashHp;
    gameState.combatHints = onVictoryForHints(gameState.combatHints);
    gameState.foe = spawnFoeFromQueue();
    gameState.combatHints = onNextFoeForHints(gameState.combatHints, {
      hypeLevel: gameState.hypeLevel,
      hp: gameState.player.hp,
      maxHp: gameState.player.maxHp,
      wave: gameState.wave,
      viaKill: true,
    });
    gameState.foeHypeLevel = 0;
    persist();

    if (playerLevel > levelBefore) {
      render();
      void playLevelUpNotice(playerLevel);
    }
  } else if (fledId) {
    gameState.waveAttempt += 1;
    const advanced = advanceFoeQueueAfterFlee(
      gameState.foeQueue,
      gameState.deferredFoeIds,
      fledId,
      gameState.foeOrder,
      gameState.wave
    );
    gameState.foeQueue = advanced.queue;
    gameState.deferredFoeIds = advanced.deferred;
    gameState.foe = spawnFoeFromQueue();
    gameState.combatHints = onNextFoeForHints(gameState.combatHints, {
      hypeLevel: gameState.hypeLevel,
      hp: gameState.player.hp,
      maxHp: gameState.player.maxHp,
      wave: gameState.wave,
      viaKill: false,
    });
    gameState.foeHypeLevel = 0;
    persist();
  }

  logWaveStart();

  if (fleeWithExitAnim) {
    gameState.suppressFoePanelRender = true;
    render();
    await exitAnimPromise;
    gameState.suppressFoePanelRender = false;
    playNextFoeReveal(
      { text: `You run away from ${previousFoeName},`, kind: "player" },
      { text: `but you run into ${gameState.foe!.name}!`, kind: "foe" }
    );
  } else {
    playNextFoeReveal(
      { text: knownDefeatText ?? `You ${defeatVerb} ${previousFoeName},`, kind: "player" },
      { text: `but ${gameState.foe!.name} appears!`, kind: "foe" }
    );
  }

  if (flashWaveVictoryHealHp) {
    playFirstWaveVictoryHealHpFlash();
  }

  persist();
}

export function rollDamage(max: number): number {
  return randomDamage(max, Math.random);
}

export function rollAndApplyPlayerHeal(): {
  rolled: number;
  gained: number;
  hpBefore: number;
} {
  const hpBefore = gameState.player.hp;
  const result = applyPlayerHealRoll(
    hpBefore,
    gameState.player.maxHp,
    getHealMax(),
    Math.random
  );
  gameState.player.hp = result.hp;
  return { rolled: result.rolled, gained: result.gained, hpBefore };
}

export function showPlayerHealRoll(rolled: number): void {
  showDamagePop("hero", `+${rolled}`, "heal");
  void playHeroHeal();
}

export function nextDefeatVerb(): string {
  const result = advanceDefeatVerb(gameState.defeatVerbIndex, DEFEAT_VERBS);
  gameState.defeatVerbIndex = result.nextIndex;
  return result.verb;
}

export function startWave(): void {
  gameState.waveAttempt = 1;
  syncPlayerForCurrentWave({ healToMax: gameState.wave === 1 });
  if (gameState.foeQueue.length === 0) {
    gameState.foeQueue = buildInitialFoeQueue(gameState.foeOrder);
    gameState.deferredFoeIds = [];
  }
  pickNextFoeColor();
  gameState.foe = spawnFoeFromQueue();
  gameState.foeHypeLevel = 0;
  gameState.combatHints = maybeArmDanceHintForWave(gameState.combatHints, gameState.wave);
  applyFoeColorTheme(gameState.foeColorTheme);
  logWaveStart();
  setBattleLines(el.battleText, [{ text: `${gameState.foe.name} appears!`, kind: "foe" }]);
  revealBattleLog();
  render();
  playFoeEntrance();
  persist();
}

export function gameOverSummaryText(currentWave: number, isNewRecord = false): string {
  const completedWave = Math.max(0, currentWave - 1);
  const waveText = completedWave === 1 ? "1 wave" : `${completedWave} waves`;
  const summary = `You beat ${waveText}.`;
  return isNewRecord ? `NEW RECORD! ${summary}` : summary;
}

export function updateRecordsOnGameOver(): boolean {
  const save = loadSave();
  const completedWave = Math.max(0, gameState.wave - 1);
  const isNewRecord = completedWave > save.bestWave;
  const bestWave = Math.max(save.bestWave, completedWave);
  const runsPlayed = save.runsPlayed + 1;

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      withSaveMeta({
        bestWave,
        runsPlayed,
        playerEmoji: gameState.player.emoji,
        heroName: gameState.player.name,
        heroColorTheme: gameState.heroColorTheme,
        setupActive: false,
        snapshot: getSnapshot(),
      })
    )
  );

  el.gameOverSummary.textContent = gameOverSummaryText(gameState.wave, isNewRecord);
  return isNewRecord;
}

export function updateRecordsOnVictory(): void {
  const save = loadSave();
  const bestWave = Math.max(save.bestWave, getCampaignLength());
  const runsPlayed = save.runsPlayed + 1;

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      withSaveMeta({
        bestWave,
        runsPlayed,
        playerEmoji: gameState.player.emoji,
        heroName: gameState.player.name,
        heroColorTheme: gameState.heroColorTheme,
        setupActive: false,
        snapshot: getSnapshot(),
      })
    )
  );

  el.gameOverSummary.textContent = `All ${CAMPAIGN_WAVES} waves cleared. Critterwave legend.`;
}

export function endGame(): void {
  stopVictoryCelebration(el.victoryEmojiLayer);
  applyCombatGateState(blockCombatForScreenEnd(combatGateState()));
  gameState.phase = "gameover";
  clearAllHype();
  logEndTitle("GAME OVER");
  updateRecordsOnGameOver();
  persist();
  render();
}

export function winCampaign(): void {
  applyCombatGateState(blockCombatForScreenEnd(combatGateState()));
  gameState.phase = "victory";
  clearAllHype();
  logEndTitle(`YOU WIN!`);
  updateRecordsOnVictory();
  startVictoryCelebration(
    el.victoryEmojiLayer,
    FOES.map((f) => f.emoji),
    gameState.player.emoji
  );
  persist();
  render();
}

export async function winWave(defeatVerb: string, defeatText: string): Promise<void> {
  if (!gameState.foe) return;

  const defeatedFoe = gameState.foe.name;
  if (gameState.wave >= getCampaignLength()) {
    winCampaign();
    return;
  }

  await transitionToNextWave(defeatedFoe, "defeat", "foe", undefined, defeatVerb, defeatText);
}

export function playHitExchange(
  attacker: "hero" | "foe",
  victim: "hero" | "foe",
  fatal = false
): void {
  const attackerPanel = attacker === "hero" ? el.playerPanel : el.foePanel;
  const victimPanel = victim === "hero" ? el.playerPanel : el.foePanel;
  const attackerStack = attackerPanel.querySelector<HTMLElement>(".emoji-stack");
  const victimStack = victimPanel.querySelector<HTMLElement>(".emoji-stack");
  const victimMark = victimPanel.querySelector<HTMLElement>(".hit-mark");
  if (!attackerStack || !victimStack || !victimMark) return;

  const ms = fatal ? 450 : 400;
  const lungeClass = attacker === "hero" ? "hero-lunge" : "foe-lunge";
  const hitClass =
    victim === "hero"
      ? fatal
        ? "hero-took-hit-fatal"
        : "hero-took-hit"
      : fatal
        ? "foe-took-hit-fatal"
        : "foe-took-hit";

  briefClass(attackerStack, lungeClass, ms);
  briefClass(victimStack, hitClass, ms);
  briefClass(victimMark, fatal ? "hit-mark-active-kill" : "hit-mark-active", ms);
}

export function applyFoeCounterAttack(): number | null {
  if (!gameState.foe || gameState.foe.hp <= 0) return null;

  const hit = rollDamage(getEffectiveFoeAttack());
  gameState.player.hp = Math.max(0, gameState.player.hp - hit);
  if (hit > 0) {
    const damageHint = recordPlayerDamageForHints(gameState.combatHints);
    gameState.combatHints = damageHint.flags;
    if (damageHint.flashHp) {
      playFirstPlayerDamageHpFlash();
    }
    applyPlayerHitHypeLoss(hit);
  }

  if (gameState.player.hp > 0) {
    gameState.turn += 1;
  }

  return hit;
}

export function playFoeCounterHitVisuals(hit: number, fatal: boolean): void {
  // Hero's hit react may still be on the foe stack; clear so foe-lunge doesn't fight foe-took-hit.
  clearHitReact(el.foePanel);
  clearHitReact(el.playerPanel);
  showDamagePop("hero", `-${hit}`, "damage");
  playHitExchange("foe", "hero", fatal);
}

export function scheduleFoeCounterHitVisuals(hit: number, generation: number): void {
  const fatal = gameState.player.hp <= 0;
  window.setTimeout(() => {
    if (isFollowUpTimerStale(generation, combatGateState(), gameState.phase)) {
      finishCombatAction(generation);
      return;
    }
    playFoeCounterHitVisuals(hit, fatal);
    if (fatal) {
      void handlePlayerDeath().finally(() => finishCombatAction(generation));
      return;
    }
    finishCombatAction(generation);
  }, FOE_FOLLOW_UP_DELAY_MS);
}

export function scheduleFoeDanceFollowUp(
  generation: number,
  opts: { foeDances: boolean; foeGain: number; foeCapped: boolean }
): void {
  const delay = foeFollowUpDelayMs(opts.foeDances);
  window.setTimeout(() => {
    if (isFollowUpTimerStale(generation, combatGateState(), gameState.phase)) {
      finishCombatAction(generation);
      return;
    }
    if (opts.foeDances) {
      playFoeDance();
    }
    if (opts.foeGain > 0) {
      showDamagePop("foe", "HYPE", "hype");
    }
    finishCombatAction(generation);
  }, delay);
}

export function onAttack(): void {
  const generation = lockCombat();
  if (generation === null) return;
  const currentFoe = gameState.foe!;
  const actionTurn = gameState.turn;

  const firstAttack = !gameState.combatHints.dismissedAttackHint;
  gameState.combatHints = recordAttackForHints(gameState.combatHints);
  syncCombatHintClasses();
  if (firstAttack) {
    playFirstAttackFoeHpFlash();
  }

  const hit = rollDamage(getEffectiveAttack());
  currentFoe.hp = Math.max(0, currentFoe.hp - hit);
  if (hit > 0) {
    applyFoeHitHypeLoss(hit);
  }
  const foeKilled = currentFoe.hp <= 0;
  showDamagePop("foe", `-${hit}`, "damage");
  playHitExchange("hero", "foe", foeKilled);

  if (foeKilled) {
    const defeatVerb = nextDefeatVerb();
    const defeatText = `You ${defeatVerb} ${currentFoe.name} with ${hit} damage,`;
    logLine(
      defeatText,
      "player",
      "Attack",
      actionTurn,
      `You ${defeatVerb} ${currentFoe.name} with ${hit} damage.`
    );
    render();
    const isFinal = gameState.wave >= getCampaignLength();
    void playFoeDefeat(isFinal)
      .then(async () => {
        if (isFinal) {
          applyWaveVictoryHeal();
          await playXpBarFullBeat();
          winCampaign();
        } else {
          return winWave(defeatVerb, defeatText);
        }
      })
      .finally(() => finishCombatAction(generation));
    return;
  }

  applyCombatGateState(beginAwaitingFoeResponse(combatGateState()));
  const counterHit = applyFoeCounterAttack();
  syncCombatHintClasses();
  if (counterHit === null) {
    finishCombatAction(generation);
    return;
  }

  logBattleLines(
    { text: `You hit ${currentFoe.name} for ${hit} damage.`, kind: "player" },
    { text: `${currentFoe.name} hits you for ${counterHit} damage.`, kind: "foe" },
    "Attack",
    actionTurn
  );
  render();
  persist();
  scheduleFoeCounterHitVisuals(counterHit, generation);
}

export function applyHealPop(gained: number): void {
  if (gained <= 0) {
    return;
  }
  showDamagePop("hero", `+${gained}`, "heal");
  render();
  void playHeroHeal();
}

export function applyWaveVictoryHealPop(hpBefore: number): void {
  applyHealPop(gameState.player.hp - hpBefore);
}

export function applyFleeHeal(): void {
  const { rolled, gained } = rollAndApplyPlayerHeal();
  showPlayerHealRoll(rolled);
  if (gained > 0) {
    render();
    persist();
  }
}

export function applyWaveVictoryHeal(): void {
  const before = gameState.player.hp;
  gameState.player.hp = healHpAfterWaveVictory(before, gameState.player.maxHp);
  applyWaveVictoryHealPop(before);
}

export function onHeal(): void {
  const generation = lockCombat();
  if (generation === null) return;
  const currentFoe = gameState.foe!;
  const actionTurn = gameState.turn;

  gameState.skipPlayerHypeTeachThisRender = true;

  const { rolled, gained } = rollAndApplyPlayerHeal();
  const firstMeaningfulHeal =
    !gameState.combatHints.dismissedHealHint && gained > 0;
  gameState.combatHints = recordHealForHints(gameState.combatHints, { armDance: gained > 0 });
  syncCombatHintClasses();
  if (firstMeaningfulHeal) {
    playFirstHealHpFlash();
  }
  showPlayerHealRoll(rolled);

  applyCombatGateState(beginAwaitingFoeResponse(combatGateState()));
  const counterHit = applyFoeCounterAttack();
  syncCombatHintClasses();
  if (counterHit === null) {
    render();
    persist();
    finishCombatAction(generation);
    return;
  }

  logBattleLines(
    { text: `You healed yourself for ${rolled} HP.`, kind: "player" },
    { text: `${currentFoe.name} hits you for ${counterHit} damage.`, kind: "foe" },
    "Heal",
    actionTurn
  );
  render();
  persist();
  scheduleFoeCounterHitVisuals(counterHit, generation);
}

export function onDance(): void {
  const generation = lockCombat();
  if (generation === null) return;
  const currentFoe = gameState.foe!;
  const actionTurn = gameState.turn;

  const isFirstDance = !gameState.combatHints.celebratedFirstDance;
  gameState.combatHints = recordDanceForHints(gameState.combatHints);
  syncCombatHintClasses();

  const response = isFirstDance
    ? pickFirstDanceResponse()
    : pickRandomDanceResponse();
  const attemptedPlayerGain = getPlayerHypeGain(response);
  const attemptedFoeGain = getFoeHypeGain(response);
  const joins = response.foeJoins === true;

  const actualPlayerGain = Math.min(attemptedPlayerGain, hypeHeadroom(gameState.hypeLevel));
  const actualFoeGain = Math.min(attemptedFoeGain, hypeHeadroom(gameState.foeHypeLevel));
  const playerCapped =
    attemptedPlayerGain > 0 && actualPlayerGain < attemptedPlayerGain;
  const foeCapped = attemptedFoeGain > 0 && actualFoeGain < attemptedFoeGain;

  if (actualPlayerGain > 0) {
    applyPlayerDanceBuff(actualPlayerGain);
  }
  if (actualFoeGain > 0) {
    applyFoeDanceBuff(actualFoeGain);
  }

  const opener = pickRandomDanceOpener();
  const reaction = formatFoeInText(response.message);
  const tail = formatDanceHypeTail(actualPlayerGain, actualFoeGain, currentFoe.name, {
    playerCapped,
    foeCapped,
  });

  playHeroDance();
  logDanceLines(opener, reaction, {
    playerGain: actualPlayerGain,
    foeGain: actualFoeGain,
    playerCapped,
    foeCapped,
    turnOverride: actionTurn,
  });

  const foeDances = joins || attemptedFoeGain > 0;
  if (tail) {
    if (actualPlayerGain > 0) {
      showDamagePop("hero", "HYPE", "hype");
    }
  }

  gameState.turn += 1;
  render();
  persist();
  scheduleFoeDanceFollowUp(generation, {
    foeDances,
    foeGain: actualFoeGain,
    foeCapped,
  });
}

export function onRun(): void {
  const generation = lockCombat();
  if (generation === null) return;
  const currentFoe = gameState.foe!;

  if (gameState.wave >= getCampaignLength()) {
    logLine("No fleeing the final foe!", "info", "Run");
    finishCombatAction(generation);
    return;
  }

  gameState.combatHints = deferDanceHintAfterRun(gameState.combatHints);
  gameState.combatHints = recordRunForHints(gameState.combatHints);
  syncCombatHintClasses();

  clearAllHype();
  applyFleeHeal();
  const fledFoe = currentFoe.name;
  const exitAnimPromise = playRunExit();
  void transitionToNextWave(fledFoe, "flee", "run", exitAnimPromise).finally(() =>
    finishCombatAction(generation)
  );
}

export function resetGame(): void {
  gameState.turn = 1;
  gameState.wave = 1;
  gameState.defeatVerbIndex = 0;
  gameState.foeOrder = buildFoeOrder(gameState.player.emoji);
  gameState.foeQueue = buildInitialFoeQueue(gameState.foeOrder);
  gameState.deferredFoeIds = [];
  syncPlayerForCurrentWave({ healToMax: true });
  clearAllHype();
  gameState.lastFoeColorTheme = null;
  resetDancePicker();
  gameState.combatHints = createCombatHintsState();
  gameState.phase = "combat";
  applyCombatGateState(resetCombatGate(combatGateState()));
  clearCombatAnimations();
  stopVictoryCelebration(el.victoryEmojiLayer);
  el.gameOver.classList.add("hidden");
  clearLog();
  startWave();
}
