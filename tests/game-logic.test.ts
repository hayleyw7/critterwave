import { describe, expect, it } from "vitest";
import { FOES } from "../src/data/foes-data.js";
import {
  applyPlayerHealRoll,
  applyHypeGain,
  hypeAfterTakingHit,
  applyPlayerStatsForWave,
  buildFoeOrder,
  CAMPAIGN_WAVE_COUNT,
  canFleeWave,
  clampBattleLevel,
  clampHype,
  DEFEAT_VERBS,
  effectiveAttack,
  foeColorConflictsWithHero,
  foeDifficultyOffset,
  foeLevelForTemplate,
  foeStatScore,
  foesForHero,
  formatFoeInText,
  formatHypeLabel,
  formatSetupBlockerMessage,
  getSetupBlockers,
  healHpAfterWaveVictory,
  heroLabelFromFoeName,
  HERO_NAME_MAX_LENGTH,
  hypeAttackBonus,
  HYPE_ATTACK_PER_LEVEL,
  hypeHeadroom,
  hypeAfterCounterHit,
  HYPE_MAX,
  isLevelBandFinale,
  LEVEL_COUNT,
  advanceFoeQueueAfterFlee,
  advanceFoeQueueAfterVictory,
  buildInitialFoeQueue,
  buildQueueCycleFromWave,
  makeFoeForWave,
  makeFoeFromTemplate,
  nextDefeatVerb,
  normalizeHeroName,
  pickFoeFromOrder,
  pickFoeTemplateIndex,
  playerLevelForWave,
  playerStatsForLevel,
  playerStatsForWave,
  refreshWaveFoeFromTemplate,
  WAVES_PER_LEVEL,
  xpProgressForDisplay,
  xpProgressForWave,
  xpPercentForDisplay,
  xpPercentForWave,
  randomDamage,
  randomHeal,
  restoreFoeOrder,
  scaleFoeAttack,
  scaleFoeHp,
  shuffleArray,
  waveVictoryHealGain,
  WAVE_VICTORY_HEAL_RATIO,
} from "../src/lib/game-logic.js";

const SAMPLE_FOES = [
  { id: "a", name: "Angry Ant", emoji: "🐜", baseHp: 8, baseAtk: 2 },
  { id: "b", name: "Baleful Bear", emoji: "🐻", baseHp: 14, baseAtk: 4 },
  { id: "c", name: "Conniving Cat", emoji: "🐱", baseHp: 10, baseAtk: 3 },
] as const;

describe("heroLabelFromFoeName", () => {
  it("uses the noun half of alliterative names", () => {
    expect(heroLabelFromFoeName("Rabid Rabbit")).toBe("Rabbit");
    expect(heroLabelFromFoeName("Skrill Skrimp")).toBe("Skrimp");
  });

  it("falls back to the only word when needed", () => {
    expect(heroLabelFromFoeName("Solo")).toBe("Solo");
  });
});

describe("foesForHero", () => {
  it("excludes the hero emoji from the roster", () => {
    const roster = foesForHero(SAMPLE_FOES, "🐱");
    expect(roster).toHaveLength(2);
    expect(roster.every((f) => f.emoji !== "🐱")).toBe(true);
  });

  it("returns a full copy when hero emoji is not in roster", () => {
    expect(foesForHero(SAMPLE_FOES, "🦄")).toHaveLength(3);
  });
});

describe("shuffleArray", () => {
  it("is deterministic with a seeded random", () => {
    const makeSeededRandom = () => {
      const values = [0.9, 0.1, 0.5];
      let i = 0;
      return () => values[i++ % values.length]!;
    };
    expect(shuffleArray(["a", "b", "c"], makeSeededRandom())).toEqual(
      shuffleArray(["a", "b", "c"], makeSeededRandom())
    );
  });

  it("preserves all items", () => {
    const shuffled = shuffleArray([1, 2, 3, 4], () => 0.25);
    expect(shuffled.sort()).toEqual([1, 2, 3, 4]);
  });
});

describe("buildFoeOrder", () => {
  it("never includes the hero emoji", () => {
    const order = buildFoeOrder(SAMPLE_FOES, "🐻", () => 0.5);
    expect(order.some((f) => f.emoji === "🐻")).toBe(false);
  });
});

describe("restoreFoeOrder", () => {
  it("restores a valid saved order", () => {
    const hero = "🐱";
    const expected = foesForHero(SAMPLE_FOES, hero);
    const ids = [...expected].reverse().map((f) => f.id);
    const restored = restoreFoeOrder(ids, hero, SAMPLE_FOES, () => 0);
    expect(restored.map((f) => f.id)).toEqual(ids);
  });

  it("rebuilds when ids are missing or invalid", () => {
    const hero = "🐱";
    const rebuilt = restoreFoeOrder(["nope"], hero, SAMPLE_FOES, () => 0);
    expect(rebuilt).toHaveLength(foesForHero(SAMPLE_FOES, hero).length);
  });

  it("rebuilds when saved order includes hero emoji foe", () => {
    const hero = "🐱";
    const badIds = ["a", "c", "c"];
    const rebuilt = restoreFoeOrder(badIds, hero, SAMPLE_FOES, () => 0);
    expect(rebuilt).toHaveLength(2);
  });
});

describe("level progression", () => {
  it("maps waves to player levels 1-10", () => {
    expect(playerLevelForWave(1)).toBe(1);
    expect(playerLevelForWave(10)).toBe(1);
    expect(playerLevelForWave(11)).toBe(2);
    expect(playerLevelForWave(21)).toBe(3);
    expect(playerLevelForWave(100)).toBe(10);
  });

  it("clamps battle levels to the campaign cap", () => {
    expect(clampBattleLevel(0)).toBe(1);
    expect(clampBattleLevel(1)).toBe(1);
    expect(clampBattleLevel(LEVEL_COUNT)).toBe(LEVEL_COUNT);
    expect(clampBattleLevel(99)).toBe(LEVEL_COUNT);
    expect(foeLevelForTemplate(SAMPLE_FOES[1]!, 500)).toBe(LEVEL_COUNT);
  });

  it("scales player stats by level", () => {
    expect(playerStatsForLevel(1)).toEqual({
      level: 1,
      maxHp: 20,
      attack: 5,
      healMax: 7,
    });
    expect(playerStatsForLevel(5).maxHp).toBe(32);
    expect(playerStatsForLevel(10).attack).toBe(14);
    expect(playerStatsForLevel(10).healMax).toBe(16);
  });

  it("derives wave stats from the wave band", () => {
    expect(playerStatsForWave(1)).toEqual(playerStatsForLevel(1));
    expect(playerStatsForWave(15).level).toBe(2);
    expect(playerStatsForWave(15).maxHp).toBe(23);
  });

  it("tracks xp progress within each 10-wave band", () => {
    expect(WAVES_PER_LEVEL).toBe(10);
    expect(xpProgressForWave(1)).toEqual({ current: 0, max: 10 });
    expect(xpPercentForWave(1)).toBe(0);
    expect(xpProgressForWave(10)).toEqual({ current: 9, max: 10 });
    expect(xpPercentForWave(10)).toBe(90);
    expect(xpProgressForWave(11)).toEqual({ current: 0, max: 10 });
    expect(xpPercentForWave(11)).toBe(0);
    expect(xpProgressForWave(20)).toEqual({ current: 9, max: 10 });
    expect(xpPercentForWave(20)).toBe(90);
    expect(xpPercentForWave(100)).toBe(90);
  });

  it("shows a full xp bar on the campaign victory screen", () => {
    expect(xpPercentForDisplay(100, "victory")).toBe(100);
    expect(xpProgressForDisplay(100, "victory")).toEqual({ current: 10, max: 10 });
    expect(xpPercentForDisplay(100, "combat")).toBe(90);
  });

  it("flags level-band finales before the campaign ends", () => {
    expect(isLevelBandFinale(10)).toBe(true);
    expect(isLevelBandFinale(20)).toBe(true);
    expect(isLevelBandFinale(9)).toBe(false);
    expect(isLevelBandFinale(11)).toBe(false);
    expect(isLevelBandFinale(CAMPAIGN_WAVE_COUNT)).toBe(false);
  });

  it("applies wave stats with heal-to-max and level-up hp bumps", () => {
    expect(
      applyPlayerStatsForWave(1, { hp: 5, maxHp: 20 }, { healToMax: true })
    ).toEqual({ hp: 20, maxHp: 20, attack: 5, level: 1 });

    const leveled = applyPlayerStatsForWave(11, { hp: 18, maxHp: 20 }, {
      grantMaxHpIncrease: true,
    });
    expect(leveled.maxHp).toBe(23);
    expect(leveled.hp).toBe(21);
    expect(leveled.level).toBe(2);
  });

  it("scores roster toughness and maps difficulty offsets", () => {
    const easy = SAMPLE_FOES[0]!;
    const mid = SAMPLE_FOES[2]!;
    const hard = SAMPLE_FOES[1]!;
    expect(foeStatScore(easy)).toBe(12);
    expect(foeDifficultyOffset(easy)).toBe(-1);
    expect(foeDifficultyOffset(mid)).toBe(0);
    expect(foeDifficultyOffset(hard)).toBe(1);
  });

  it("offsets foe level from roster toughness", () => {
    const easy = SAMPLE_FOES[0]!;
    const hard = SAMPLE_FOES[1]!;
    expect(foeLevelForTemplate(easy, 5)).toBe(1);
    expect(foeLevelForTemplate(hard, 5)).toBe(2);
    expect(foeLevelForTemplate(easy, 21)).toBe(2);
    expect(foeLevelForTemplate(hard, 21)).toBe(4);
  });

  it("scales early foes proportionally with player level", () => {
    const hard = SAMPLE_FOES[1]!;
    const wave5 = makeFoeFromTemplate(hard, 5);
    const wave15 = makeFoeFromTemplate(hard, 15);
    expect(wave5.level).toBe(2);
    expect(wave15.level).toBe(3);
    expect(wave15.hp).toBeGreaterThan(wave5.hp);
    expect(wave15.attack).toBeGreaterThan(wave5.attack);
  });

  it("builds foes from wave order", () => {
    const order = foesForHero(SAMPLE_FOES, "🐱");
    const wave1 = makeFoeForWave(order, 1);
    const wave2 = makeFoeForWave(order, 2);
    expect(wave1.id).toBe(pickFoeFromOrder(order, 1).id);
    expect(wave2.id).toBe(pickFoeFromOrder(order, 2).id);
    expect(wave1.level).toBeGreaterThanOrEqual(1);
  });

  it("defers fled foes to the back of the queue", () => {
    const order = foesForHero(SAMPLE_FOES, "🐱");
    const ids = buildInitialFoeQueue(order);
    const fled = advanceFoeQueueAfterFlee(ids, [], ids[0]!, order, 1);
    expect(fled.queue[0]).toBe(ids[1]);
    expect(fled.deferred).toEqual([ids[0]]);

    const won = advanceFoeQueueAfterVictory(fled.queue, fled.deferred, order, 2);
    if (ids.length > 2) {
      expect(won.queue[0]).toBe(ids[2]);
      expect(won.deferred).toEqual([ids[0]]);
    } else {
      expect(won.queue[0]).toBe(ids[0]);
      expect(won.deferred).toEqual([]);
    }
  });

  it("brings deferred foes back after clearing the queue", () => {
    const order = foesForHero(SAMPLE_FOES, "🐱");
    const ids = buildInitialFoeQueue(order);
    const fled = advanceFoeQueueAfterFlee([ids[0]!], [], ids[0]!, order, 1);
    let queue = fled.queue;
    let deferred = fled.deferred;
    while (queue.length > 1) {
      const next = advanceFoeQueueAfterVictory(queue, deferred, order, 2);
      queue = next.queue;
      deferred = next.deferred;
    }
    const final = advanceFoeQueueAfterVictory(queue, deferred, order, 3);
    expect(final.queue[0]).toBe(ids[0]);
    expect(final.deferred).toEqual([]);
  });

  it("refreshes foe stats without overhealing", () => {
    const hard = SAMPLE_FOES[1]!;
    const refreshed = refreshWaveFoeFromTemplate(99, hard, 5);
    expect(refreshed.hp).toBeLessThanOrEqual(refreshed.maxHp);
    expect(refreshed.attack).toBe(makeFoeFromTemplate(hard, 5).attack);
  });
  it("restores a fraction of missing hp after wave wins", () => {
    expect(WAVE_VICTORY_HEAL_RATIO).toBe(0.3);
    expect(waveVictoryHealGain(20, 20)).toBe(0);
    expect(waveVictoryHealGain(8, 20)).toBe(6);
    expect(healHpAfterWaveVictory(8, 20)).toBe(14);
    expect(healHpAfterWaveVictory(14, 20)).toBe(20);
  });
});

describe("wave scaling", () => {
  it("lightly softens low-level foe hp", () => {
    expect(scaleFoeHp(10, 1)).toBe(10);
    expect(scaleFoeAttack(3, 1)).toBe(3);
  });

  it("softens level-2 foe hp slightly", () => {
    expect(scaleFoeHp(10, 2)).toBe(12);
    expect(scaleFoeAttack(3, 2)).toBe(4);
  });

  it("scales hp and attack by foe level", () => {
    expect(scaleFoeHp(10, 3)).toBe(16);
    expect(scaleFoeAttack(3, 3)).toBe(5);
  });

  it("never drops scaled stats below minimums", () => {
    expect(scaleFoeHp(4, 1)).toBe(4);
    expect(scaleFoeAttack(1, 1)).toBe(1);
  });

  it("builds wave foes from order with levels", () => {
    const hard = SAMPLE_FOES[1]!;
    const wave1 = makeFoeFromTemplate(hard, 1);
    const wave21 = makeFoeFromTemplate(hard, 21);
    expect(wave21.level).toBeGreaterThan(wave1.level);
    expect(wave21.hp).toBeGreaterThan(wave1.hp);
    expect(wave21.attack).toBeGreaterThan(wave1.attack);
  });

  it("cycles templates when waves exceed roster size", () => {
    const order = foesForHero(SAMPLE_FOES, "🐜");
    const waves = [1, 2, 3, 4].map((w) => pickFoeFromOrder(order, w).id);
    expect(waves[2]).toBe(waves[0]);
    expect(waves[3]).toBe(waves[1]);
  });

  it("throws when foe order is empty", () => {
    expect(() => pickFoeTemplateIndex(1, 0)).toThrow(/empty/i);
  });
});

describe("normalizeHeroName", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeHeroName("  Spaced   Out  ")).toBe("Spaced Out");
  });

  it("truncates to max length", () => {
    const long = "a".repeat(HERO_NAME_MAX_LENGTH + 10);
    expect(normalizeHeroName(long)).toHaveLength(HERO_NAME_MAX_LENGTH);
  });

  it("returns empty for blank input", () => {
    expect(normalizeHeroName("   ")).toBe("");
  });

  it("strips angle brackets from names", () => {
    expect(normalizeHeroName("<Pat>")).toBe("Pat");
    expect(normalizeHeroName("<>")).toBe("");
  });
});

describe("setup blockers", () => {
  it("blocks when critter or name missing", () => {
    expect(getSetupBlockers(null, "")).toEqual([
      "pick a critter",
      "enter your name",
    ]);
    expect(getSetupBlockers("🐱", "")).toEqual(["enter your name"]);
    expect(getSetupBlockers(null, "Pat")).toEqual(["pick a critter"]);
  });

  it("allows fight when ready", () => {
    expect(getSetupBlockers("🐱", "Pat")).toEqual([]);
  });

  it("formats blocker messages", () => {
    expect(formatSetupBlockerMessage([])).toBe("");
    expect(formatSetupBlockerMessage(["enter your name"])).toBe(
      "To fight, enter your name."
    );
    expect(
      formatSetupBlockerMessage(["pick a critter", "enter your name"])
    ).toBe("To fight, pick a critter and enter your name.");
  });
});

describe("foe color conflicts", () => {
  it("conflicts when hero and foe use the same theme", () => {
    expect(foeColorConflictsWithHero("green", "green")).toBe(true);
    expect(foeColorConflictsWithHero("green", "amber")).toBe(false);
    expect(foeColorConflictsWithHero("rose", "rose")).toBe(true);
    expect(foeColorConflictsWithHero("sky", "amber")).toBe(false);
  });
});

describe("formatFoeInText", () => {
  it("substitutes foe name placeholders", () => {
    expect(formatFoeInText("{foe} boos loudly.", "Rotten Roach")).toBe(
      "Rotten Roach boos loudly."
    );
    expect(formatFoeInText("{foe} and {foe}", "X")).toBe("X and X");
  });
});

describe("defeat verbs", () => {
  it("uses beat not the old best typo", () => {
    expect(DEFEAT_VERBS).toContain("beat");
    expect(DEFEAT_VERBS).not.toContain("best");
    expect(DEFEAT_VERBS).not.toContain("bested");
  });

  it("cycles through verbs", () => {
    let index = 0;
    const first = nextDefeatVerb(index);
    expect(first.verb).toBe(DEFEAT_VERBS[0]);
    const second = nextDefeatVerb(first.nextIndex);
    expect(second.verb).toBe(DEFEAT_VERBS[1]);
  });

  it("wraps at end of list", () => {
    const wrapped = nextDefeatVerb(DEFEAT_VERBS.length);
    expect(wrapped.verb).toBe(DEFEAT_VERBS[0]);
  });
});

describe("combat math", () => {
  it("rolls damage between 1 and max inclusive", () => {
    expect(randomDamage(5, () => 0)).toBe(1);
    expect(randomDamage(5, () => 0.99)).toBe(5);
  });

  it("rolls heal between 1 and max inclusive", () => {
    expect(randomHeal(3, () => 0)).toBe(1);
    expect(randomHeal(3, () => 0.99)).toBe(3);
  });

  it("player heal roll uses heal dice and caps at max hp", () => {
    expect(applyPlayerHealRoll(20, 20, 5, () => 0)).toEqual({
      rolled: 1,
      hp: 20,
      gained: 0,
    });
    expect(applyPlayerHealRoll(8, 20, 5, () => 0)).toEqual({
      rolled: 1,
      hp: 9,
      gained: 1,
    });
    expect(applyPlayerHealRoll(8, 20, 5, () => 0.99)).toEqual({
      rolled: 5,
      hp: 13,
      gained: 5,
    });
    expect(applyPlayerHealRoll(18, 20, 5, () => 0.99)).toEqual({
      rolled: 5,
      hp: 20,
      gained: 2,
    });
  });

  it("loses one hype per hit taken when damage is dealt", () => {
    expect(hypeAfterTakingHit(3, 4)).toBe(2);
    expect(hypeAfterTakingHit(0, 2)).toBe(0);
    expect(hypeAfterTakingHit(5, 0)).toBe(5);
  });

  it("rejects invalid damage max", () => {
    expect(() => randomDamage(0, () => 0.5)).toThrow(/at least 1/i);
  });

  it("adds hype to attack", () => {
    expect(HYPE_ATTACK_PER_LEVEL).toBe(1);
    expect(hypeAttackBonus(0)).toBe(0);
    expect(hypeAttackBonus(2)).toBe(2);
    expect(hypeAttackBonus(-1)).toBe(0);
    expect(effectiveAttack(5, 2)).toBe(7);
    expect(effectiveAttack(14, 5)).toBe(19);
  });

  it("clamps hype to max", () => {
    expect(clampHype(6)).toBe(HYPE_MAX);
    expect(clampHype(-1)).toBe(0);
    expect(applyHypeGain(4, 2)).toBe(HYPE_MAX);
    expect(hypeHeadroom(HYPE_MAX)).toBe(0);
    expect(hypeHeadroom(3)).toBe(2);
    expect(formatHypeLabel(3)).toBe("HYPE 3/5");
    expect(formatHypeLabel(7)).toBe("HYPE 5/5");
  });

  it("counter hits strip hype without heal granting hype", () => {
    expect(hypeAfterCounterHit(0, true)).toBe(0);
    expect(hypeAfterCounterHit(0, false)).toBe(0);
    expect(hypeAfterCounterHit(3, true)).toBe(2);
    expect(hypeAfterCounterHit(4, true)).toBe(3);
    expect(hypeAfterCounterHit(2, true, 0)).toBe(2);
    expect(hypeAfterCounterHit(3, true, 4)).toBe(2);
    expect(hypeAfterCounterHit(5, true, 2)).toBe(4);
  });
});

describe("canFleeWave", () => {
  it("blocks fleeing on the final wave", () => {
    expect(canFleeWave(CAMPAIGN_WAVE_COUNT)).toBe(false);
    expect(canFleeWave(CAMPAIGN_WAVE_COUNT - 1)).toBe(true);
  });
});

describe("production roster smoke", () => {
  it("builds a full foe order for default hero", () => {
    const order = buildFoeOrder(FOES, "🐱", () => 0.5);
    expect(order.length).toBe(FOES.length - 1);
  });
});
