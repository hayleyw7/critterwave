import { clampHype, HYPE_ATTACK_PER_LEVEL, playerStatsForWave } from "../lib/game-logic.js";
import { CAMPAIGN_WAVES } from "./constants.js";
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
