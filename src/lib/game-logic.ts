export const CAMPAIGN_WAVE_COUNT = 100;
export const HERO_NAME_MAX_LENGTH = 16;
export const HYPE_ATTACK_PER_LEVEL = 1;
export const HYPE_MAX = 5;
export const LEVEL_COUNT = 10;
export const WAVES_PER_LEVEL = 10;

export const BASE_PLAYER_MAX_HP = 20;
export const BASE_PLAYER_ATTACK = 5;
export const BASE_HEAL_MAX = 5;
export const PLAYER_HP_PER_LEVEL = 3;
export const PLAYER_ATK_PER_LEVEL = 1;
export const HEAL_MAX_PER_LEVEL = 1;

/** Fraction of max HP restored after each wave win. */
export const WAVE_VICTORY_HEAL_RATIO = 1;

export const FOE_HP_PER_LEVEL = 3;
export const FOE_ATK_PER_LEVEL = 1;
export const FOE_LEVEL1_HP_MULTIPLIER = 0.95;
export const FOE_LEVEL2_HP_MULTIPLIER = 0.95;

export const DEFEAT_VERBS = [
  "defeat",
  "vanquish",
  "crush",
  "destroy",
  "beat",
  "obliterate",
  "smite",
  "flatten",
  "annihilate",
  "pulverize",
  "rout",
  "trounce",
  "clobber",
  "wallop",
  "thrash",
] as const;

export type FoeTemplate = {
  id: string;
  name: string;
  emoji: string;
  baseHp: number;
  baseAtk: number;
};

export type WaveFoe = {
  id: string;
  name: string;
  emoji: string;
  hp: number;
  maxHp: number;
  attack: number;
  level: number;
};

export type PlayerCombatStats = {
  level: number;
  maxHp: number;
  attack: number;
  healMax: number;
};

export function heroLabelFromFoeName(name: string): string {
  const words = name.trim().split(/\s+/);
  return words.slice(1).join(" ") || words[0]!;
}

export function shuffleArray<T>(
  items: readonly T[],
  random: () => number = Math.random
): T[] {
  const order = items.map((item) => item);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order;
}

export function foesForHero(
  allFoes: readonly FoeTemplate[],
  heroEmoji: string
): FoeTemplate[] {
  return allFoes.filter((f) => f.emoji !== heroEmoji);
}

export function buildFoeOrder(
  allFoes: readonly FoeTemplate[],
  heroEmoji: string,
  random: () => number = Math.random
): FoeTemplate[] {
  return shuffleArray(foesForHero(allFoes, heroEmoji), random);
}

export function restoreFoeOrder(
  ids: string[] | undefined,
  heroEmoji: string,
  allFoes: readonly FoeTemplate[],
  random: () => number = Math.random
): FoeTemplate[] {
  const expected = foesForHero(allFoes, heroEmoji);
  if (ids?.length === expected.length) {
    const byId = new Map(allFoes.map((f) => [f.id, f]));
    const restored = ids
      .map((id) => byId.get(id))
      .filter((f): f is FoeTemplate => !!f && f.emoji !== heroEmoji);
    if (restored.length === expected.length) {
      return restored;
    }
  }
  return buildFoeOrder(allFoes, heroEmoji, random);
}

export function pickFoeTemplateIndex(wave: number, orderLength: number): number {
  if (orderLength <= 0) {
    throw new Error("Foe order is empty");
  }
  return (wave - 1) % orderLength;
}

export function pickFoeFromOrder(
  foeOrder: readonly FoeTemplate[],
  wave: number
): FoeTemplate {
  return foeOrder[pickFoeTemplateIndex(wave, foeOrder.length)]!;
}

export function clampBattleLevel(level: number): number {
  return Math.max(1, Math.min(LEVEL_COUNT, level));
}

export function playerLevelForWave(wave: number): number {
  return clampBattleLevel(
    Math.floor((Math.max(1, wave) - 1) / WAVES_PER_LEVEL) + 1
  );
}

export function playerStatsForLevel(level: number): PlayerCombatStats {
  const lvl = clampBattleLevel(level);
  const above = lvl - 1;
  return {
    level: lvl,
    maxHp: BASE_PLAYER_MAX_HP + above * PLAYER_HP_PER_LEVEL,
    attack: BASE_PLAYER_ATTACK + above * PLAYER_ATK_PER_LEVEL,
    healMax: BASE_HEAL_MAX + above * HEAL_MAX_PER_LEVEL,
  };
}

export function playerStatsForWave(wave: number): PlayerCombatStats {
  return playerStatsForLevel(playerLevelForWave(wave));
}

/** True when clearing wave 10, 20, … — XP bar fills before the next level band. */
export function isLevelBandFinale(
  completedWave: number,
  campaignLength: number = CAMPAIGN_WAVE_COUNT
): boolean {
  return (
    completedWave % WAVES_PER_LEVEL === 0 && completedWave < campaignLength
  );
}

export function applyPlayerStatsForWave(
  wave: number,
  player: { hp: number; maxHp: number },
  options?: { healToMax?: boolean; grantMaxHpIncrease?: boolean }
): { hp: number; maxHp: number; attack: number; level: number } {
  const stats = playerStatsForWave(wave);
  const prevMax = player.maxHp;
  let hp = player.hp;

  if (options?.healToMax) {
    hp = stats.maxHp;
  } else if (options?.grantMaxHpIncrease && stats.maxHp > prevMax) {
    hp = Math.min(stats.maxHp, hp + (stats.maxHp - prevMax));
  }
  hp = Math.min(hp, stats.maxHp);

  return {
    hp,
    maxHp: stats.maxHp,
    attack: stats.attack,
    level: stats.level,
  };
}

export function refreshWaveFoeFromTemplate(
  currentHp: number,
  template: FoeTemplate,
  wave: number
): Pick<WaveFoe, "hp" | "maxHp" | "attack" | "level"> {
  const rebuilt = makeFoeFromTemplate(template, wave);
  return {
    hp: Math.min(currentHp, rebuilt.maxHp),
    maxHp: rebuilt.maxHp,
    attack: rebuilt.attack,
    level: rebuilt.level,
  };
}

/** XP toward the next level-up — 0% on wave 1, 90% on wave 10 (last mob of the band), level up at 11. */
export function xpProgressForWave(wave: number): { current: number; max: number } {
  const max = WAVES_PER_LEVEL;
  const current = (Math.max(1, wave) - 1) % max;
  return { current, max };
}

export function xpPercentForWave(wave: number): number {
  const { current, max } = xpProgressForWave(wave);
  return Math.round((current / max) * 100);
}

export type XpDisplayPhase = "combat" | "gameover" | "victory";

/** XP bar values for UI — full bar on the campaign victory screen. */
export function xpProgressForDisplay(
  wave: number,
  phase: XpDisplayPhase
): { current: number; max: number } {
  const progress = xpProgressForWave(wave);
  if (phase === "victory") {
    return { current: progress.max, max: progress.max };
  }
  return progress;
}

export function xpPercentForDisplay(wave: number, phase: XpDisplayPhase): number {
  const { current, max } = xpProgressForDisplay(wave, phase);
  return Math.round((current / max) * 100);
}

/** Rough power score from roster base stats — used to nudge foe level up/down. */
export function foeStatScore(template: FoeTemplate): number {
  return template.baseHp + template.baseAtk * 2;
}

/** Easier roster entries fight below your level; beefier ones fight above. */
export function foeDifficultyOffset(template: FoeTemplate): number {
  const score = foeStatScore(template);
  if (score <= 15) {
    return -1;
  }
  if (score >= 20) {
    return 1;
  }
  return 0;
}

export function foeLevelForTemplate(template: FoeTemplate, wave: number): number {
  return clampBattleLevel(playerLevelForWave(wave) + foeDifficultyOffset(template));
}

export function scaleFoeHp(baseHp: number, foeLevel: number): number {
  const levelBonus = Math.max(0, foeLevel - 1) * FOE_HP_PER_LEVEL;
  let hp = baseHp + levelBonus;
  if (foeLevel === 1) {
    hp = Math.round(hp * FOE_LEVEL1_HP_MULTIPLIER);
  } else if (foeLevel === 2) {
    hp = Math.round(hp * FOE_LEVEL2_HP_MULTIPLIER);
  }
  return Math.max(4, hp);
}

export function scaleFoeAttack(baseAtk: number, foeLevel: number): number {
  const levelBonus = Math.max(0, foeLevel - 1) * FOE_ATK_PER_LEVEL;
  return Math.max(1, baseAtk + levelBonus);
}

/** HP gained from the between-wave victory top-up (capped at max). */
export function waveVictoryHealGain(currentHp: number, maxHp: number): number {
  const room = Math.max(0, maxHp - currentHp);
  if (room <= 0) {
    return 0;
  }
  return Math.min(room, Math.ceil(maxHp * WAVE_VICTORY_HEAL_RATIO));
}

export function healHpAfterWaveVictory(currentHp: number, maxHp: number): number {
  return Math.min(maxHp, currentHp + waveVictoryHealGain(currentHp, maxHp));
}

export function makeFoeFromTemplate(
  template: FoeTemplate,
  wave: number
): WaveFoe {
  const level = foeLevelForTemplate(template, wave);
  const hp = scaleFoeHp(template.baseHp, level);
  const attack = scaleFoeAttack(template.baseAtk, level);
  return {
    id: template.id,
    name: template.name,
    emoji: template.emoji,
    hp,
    maxHp: hp,
    attack,
    level,
  };
}

/** Max damage a foe can roll on the next hit (includes HYPE). */
export function maxFoeHit(baseAttack: number, hypeLevel: number): number {
  return effectiveAttack(baseAttack, hypeLevel);
}

export function buildInitialFoeQueue(foeOrder: readonly FoeTemplate[]): string[] {
  return foeOrder.map((entry) => entry.id);
}

export function buildQueueCycleFromWave(
  foeOrder: readonly FoeTemplate[],
  wave: number
): string[] {
  const start = pickFoeTemplateIndex(wave, foeOrder.length);
  const ids = foeOrder.map((entry) => entry.id);
  return [...ids.slice(start), ...ids.slice(0, start)];
}

export function advanceFoeQueueAfterVictory(
  queue: readonly string[],
  deferred: readonly string[],
  foeOrder: readonly FoeTemplate[],
  nextWave: number
): { queue: string[]; deferred: string[] } {
  let nextQueue = queue.slice(1);
  let nextDeferred = [...deferred];
  if (nextQueue.length === 0 && nextDeferred.length > 0) {
    nextQueue = [...nextDeferred];
    nextDeferred = [];
  }
  if (nextQueue.length === 0) {
    nextQueue = buildQueueCycleFromWave(foeOrder, nextWave);
  }
  return { queue: nextQueue, deferred: nextDeferred };
}

export function advanceFoeQueueAfterFlee(
  queue: readonly string[],
  deferred: readonly string[],
  fledId: string,
  foeOrder: readonly FoeTemplate[],
  wave: number
): { queue: string[]; deferred: string[] } {
  let nextDeferred = [...deferred, fledId];
  let nextQueue = queue.slice(1);
  if (nextQueue.length === 0 && nextDeferred.length > 0) {
    nextQueue = [...nextDeferred];
    nextDeferred = [];
  }
  if (nextQueue.length === 0) {
    nextQueue = buildQueueCycleFromWave(foeOrder, wave);
  }
  return { queue: nextQueue, deferred: nextDeferred };
}

export function makeFoeFromQueueHead(
  queue: readonly string[],
  foeOrder: readonly FoeTemplate[],
  wave: number
): WaveFoe {
  const id = queue[0];
  if (!id) {
    throw new Error("Foe queue is empty");
  }
  const template = foeOrder.find((entry) => entry.id === id);
  if (!template) {
    throw new Error(`Unknown foe id ${id}`);
  }
  return makeFoeFromTemplate(template, wave);
}

export function makeFoeForWave(
  foeOrder: readonly FoeTemplate[],
  wave: number
): WaveFoe {
  return makeFoeFromTemplate(pickFoeFromOrder(foeOrder, wave), wave);
}

export function normalizeHeroName(
  raw: string,
  maxLength = HERO_NAME_MAX_LENGTH
): string {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[<>]/g, "")
    .slice(0, maxLength);
}

export function getSetupBlockers(
  heroEmoji: string | null | undefined,
  rawHeroName: string
): string[] {
  const blockers: string[] = [];
  if (!heroEmoji) {
    blockers.push("pick a critter");
  }
  if (!normalizeHeroName(rawHeroName)) {
    blockers.push("enter your name");
  }
  return blockers;
}

export function formatSetupBlockerMessage(blockers: string[]): string {
  if (blockers.length === 0) {
    return "";
  }
  if (blockers.length === 1) {
    return `To fight, ${blockers[0]}.`;
  }
  return `To fight, ${blockers[0]} and ${blockers[1]}.`;
}

export function foeColorConflictsWithHero(
  heroColorTheme: string,
  foeColorTheme: string
): boolean {
  return heroColorTheme === foeColorTheme;
}

export function formatFoeInText(template: string, foeName: string): string {
  return template.replace(/\{foe\}/g, foeName);
}

export function nextDefeatVerb(
  index: number,
  verbs: readonly string[] = DEFEAT_VERBS
): { verb: string; nextIndex: number } {
  const verb = verbs[index % verbs.length]!;
  return { verb, nextIndex: index + 1 };
}

export function randomDamage(max: number, random: () => number): number {
  if (max < 1) {
    throw new Error("randomDamage max must be at least 1");
  }
  return Math.floor(random() * max) + 1;
}

export function randomHeal(max: number, random: () => number): number {
  return randomDamage(max, random);
}

/** Same 1–healMax roll as the Heal command; HP capped at max. */
export function applyPlayerHealRoll(
  currentHp: number,
  maxHp: number,
  healMax: number,
  random: () => number
): { rolled: number; hp: number; gained: number } {
  if (healMax < 1) {
    return { rolled: 0, hp: currentHp, gained: 0 };
  }
  const rolled = randomHeal(healMax, random);
  const hp = Math.min(maxHp, currentHp + rolled);
  return { rolled, hp, gained: hp - currentHp };
}

/** Lose 1 HYPE when damage is taken (same rule for player and foe). */
export function hypeAfterTakingHit(hypeBefore: number, damageDealt: number): number {
  if (damageDealt <= 0) {
    return hypeBefore;
  }
  return Math.max(0, hypeBefore - 1);
}

export function hypeAttackBonus(hypeLevel: number): number {
  return Math.max(0, hypeLevel) * HYPE_ATTACK_PER_LEVEL;
}

export function clampHype(level: number, max = HYPE_MAX): number {
  return Math.max(0, Math.min(max, level));
}

export function applyHypeGain(
  current: number,
  amount: number,
  max = HYPE_MAX
): number {
  return clampHype(current + amount, max);
}

/** HYPE after taking counter damage on heal (or any hit). */
export function hypeAfterCounterHit(
  hypeBefore: number,
  counterOccurred: boolean,
  damageDealt = 1
): number {
  return counterOccurred ? hypeAfterTakingHit(hypeBefore, damageDealt) : hypeBefore;
}

export function hypeHeadroom(current: number, max = HYPE_MAX): number {
  return Math.max(0, max - clampHype(current, max));
}

export function formatHypeLabel(level: number, max = HYPE_MAX): string {
  return `HYPE ${clampHype(level, max)}/${max}`;
}

export function effectiveAttack(baseAttack: number, hypeLevel: number): number {
  return baseAttack + hypeAttackBonus(hypeLevel);
}

export function canFleeWave(wave: number, campaignLength = CAMPAIGN_WAVE_COUNT): boolean {
  return wave < campaignLength;
}
