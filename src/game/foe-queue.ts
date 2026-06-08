import {
  applyPlayerStatsForWave,
  buildFoeOrder as buildFoeOrderForHero,
  buildQueueCycleFromWave,
  makeFoeFromQueueHead,
  pickFoeFromOrder,
  refreshWaveFoeFromTemplate,
  restoreFoeOrder as restoreFoeOrderForHero,
} from "../lib/game-logic.js";
import { isColorThemeId } from "../lib/color-themes.js";
import { FOES } from "./data.js";
import type { Enemy, FoeColorTheme, FoeTemplate, GameSnapshot } from "./types.js";
import { gameState } from "./state.js";

export function normalizeFoeColorTheme(theme: string | undefined): FoeColorTheme {
  if (theme && isColorThemeId(theme)) {
    return theme;
  }
  return "amber";
}

export function buildFoeOrder(heroEmoji: string): FoeTemplate[] {
  return buildFoeOrderForHero(FOES, heroEmoji);
}

export function restoreFoeQueueState(
  snapshot: GameSnapshot,
  order: FoeTemplate[]
): { queue: string[]; deferred: string[] } {
  if (snapshot.foeQueueIds && snapshot.foeQueueIds.length > 0) {
    return {
      queue: snapshot.foeQueueIds,
      deferred: snapshot.deferredFoeIds ?? [],
    };
  }
  const cycle = buildQueueCycleFromWave(order, snapshot.wave);
  if (snapshot.foe?.id) {
    const idx = cycle.indexOf(snapshot.foe.id);
    if (idx >= 0) {
      return { queue: cycle.slice(idx), deferred: [] };
    }
  }
  return { queue: cycle, deferred: [] };
}

export function spawnFoeFromQueue(): Enemy {
  return makeFoeFromQueueHead(gameState.foeQueue, gameState.foeOrder, gameState.wave);
}

export function syncPlayerForCurrentWave(options?: {
  healToMax?: boolean;
  grantMaxHpIncrease?: boolean;
}): number {
  const next = applyPlayerStatsForWave(gameState.wave, gameState.player, options);
  gameState.player.hp = next.hp;
  gameState.player.maxHp = next.maxHp;
  gameState.player.attack = next.attack;
  return next.level;
}

export function refreshFoeStatsPreservingHp(): void {
  const currentFoe = gameState.foe;
  if (!currentFoe || gameState.foeOrder.length === 0) {
    return;
  }
  const template =
    gameState.foeOrder.find((entry) => entry.id === currentFoe.id) ??
    pickFoeFromOrder(gameState.foeOrder, gameState.wave);
  const refreshed = refreshWaveFoeFromTemplate(currentFoe.hp, template, gameState.wave);
  currentFoe.maxHp = refreshed.maxHp;
  currentFoe.attack = refreshed.attack;
  currentFoe.level = refreshed.level;
  currentFoe.hp = refreshed.hp;
}

export function restoreFoeOrder(ids: string[] | undefined, heroEmoji: string): FoeTemplate[] {
  return restoreFoeOrderForHero(ids, heroEmoji, FOES);
}
