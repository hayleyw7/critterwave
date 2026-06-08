/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it } from "vitest";
import { HYPE_ATTACK_PER_LEVEL } from "../../src/lib/game-logic.js";
import {
  getEffectiveAttack,
  getEffectiveFoeAttack,
  getFoeHypeBonus,
  getPlayerHypeBonus,
} from "../../src/game/stats.js";
import { gameState } from "../../src/game/state.js";

describe("stats — effective attack helpers", () => {
  beforeEach(() => {
    gameState.player.attack = 5;
    gameState.hypeLevel = 0;
    gameState.foeHypeLevel = 0;
    gameState.foe = {
      id: "ghoulish-gob",
      name: "Ghoulish Gob",
      emoji: "👺",
      hp: 10,
      maxHp: 10,
      attack: 4,
      level: 1,
    };
  });

  it("adds player hype bonus to base attack", () => {
    gameState.hypeLevel = 3;
    expect(getPlayerHypeBonus()).toBe(3 * HYPE_ATTACK_PER_LEVEL);
    expect(getEffectiveAttack()).toBe(5 + 3 * HYPE_ATTACK_PER_LEVEL);
  });

  it("adds foe hype bonus to foe attack", () => {
    gameState.foeHypeLevel = 2;
    expect(getFoeHypeBonus()).toBe(2 * HYPE_ATTACK_PER_LEVEL);
    expect(getEffectiveFoeAttack()).toBe(4 + 2 * HYPE_ATTACK_PER_LEVEL);
  });

  it("returns zero foe attack when no foe is active", () => {
    gameState.foe = null;
    expect(getEffectiveFoeAttack()).toBe(0);
  });
});
