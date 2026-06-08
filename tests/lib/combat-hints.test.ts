import { describe, expect, it } from "vitest";
import { hypeAfterCounterHit } from "../../src/lib/game-logic.js";
import {
  combatHintsAfterMidRunRestore,
  combatHintsForSnapshot,
  createCombatHintsState,
  isLowHpForHint,
  isFullHpForHint,
  LOW_HP_HINT_RATIO,
  attackTeachText,
  DANCE_TEACH_TEXT,
  deferDanceHintAfterRun,
  dismissDanceHintThisFoe,
  dismissDanceTeachCopy,
  dismissHealHint,
  DANCE_HINT_FALLBACK_WAVE,
  maybeArmDanceHintForWave,
  onNextFoeForHints,
  onVictoryForHints,
  recordAttackForHints,
  recordDanceForHints,
  recordHealForHints,
  recordPlayerDamageForHints,
  hypeMaxPresentation,
  tryCelebrateFirstFoeHype,
  tryCelebrateFirstPlayerHype,
  tryCelebrateFirstWaveVictoryHeal,
  recordRunForHints,
  RUN_TEACH_TEXT,
  HEAL_TEACH_TEXT,
  shouldShowAttackHint,
  shouldShowDanceHint,
  shouldShowDanceTeachCopy,
  shouldShowHealHint,
  shouldShowHealTeachCopy,
  shouldShowRunHint,
  shouldShowRunTeachCopy,
  shouldArmDanceHintForNewFoe,
  type CombatHintsState,
  type NewFoeDanceHintContext,
} from "../../src/lib/combat-hints.js";

const fresh = () => createCombatHintsState();
const combat = "combat" as const;

function newFoeAfterKill(
  flags: CombatHintsState,
  overrides: Partial<NewFoeDanceHintContext> = {}
): CombatHintsState {
  return onNextFoeForHints(flags, {
    hypeLevel: 0,
    hp: 20,
    maxHp: 20,
    wave: 2,
    viaKill: true,
    ...overrides,
  });
}

function newFoeAfterFlee(
  flags: CombatHintsState,
  overrides: Partial<NewFoeDanceHintContext> = {}
): CombatHintsState {
  return onNextFoeForHints(flags, {
    hypeLevel: 0,
    hp: 20,
    maxHp: 20,
    wave: 3,
    viaKill: false,
    ...overrides,
  });
}

function hintSnapshot(
  flags: CombatHintsState,
  opts: {
    hp?: number;
    maxHp?: number;
    hype?: number;
    foeAtk?: number;
    foeHype?: number;
    hasFoe?: boolean;
  } = {}
) {
  const hp = opts.hp ?? 20;
  const maxHp = opts.maxHp ?? 20;
  const hasFoe = opts.hasFoe ?? true;
  const hype = opts.hype ?? 0;
  const foeAtk = opts.foeAtk ?? 3;
  const foeHype = opts.foeHype ?? 0;
  return {
    heal: shouldShowHealHint(flags, hp, maxHp, combat, hasFoe, foeAtk, foeHype),
    dance: shouldShowDanceHint(flags, hp, maxHp, combat, hasFoe, hype, foeAtk, foeHype),
    run: shouldShowRunHint(flags, hp, foeAtk, foeHype, combat, hasFoe),
  };
}

describe("combat hints — thresholds", () => {
  it("uses 60% low-hp threshold with integer-safe edges", () => {
    expect(LOW_HP_HINT_RATIO).toBe(0.6);
    expect(isLowHpForHint(12, 20)).toBe(true);
    expect(isLowHpForHint(13, 20)).toBe(false);
    expect(isLowHpForHint(0, 20)).toBe(false);
    expect(isLowHpForHint(20, 20)).toBe(false);
    expect(isLowHpForHint(10, 0)).toBe(false);
  });

  it("uses full-hp check for dance hint eligibility", () => {
    expect(isFullHpForHint(20, 20)).toBe(true);
    expect(isFullHpForHint(19, 20)).toBe(false);
    expect(isFullHpForHint(20, 0)).toBe(false);
  });
});

describe("combat hints — per-run dismissals", () => {
  it("attack outline shows until first attack, then never again", () => {
    expect(shouldShowAttackHint(fresh(), combat, true)).toBe(true);
    expect(shouldShowAttackHint(fresh(), combat, false)).toBe(false);
    expect(shouldShowAttackHint(fresh(), "setup", true)).toBe(false);

    const once = recordAttackForHints(fresh());
    expect(shouldShowAttackHint(once, combat, true)).toBe(false);
    expect(recordAttackForHints(once)).toBe(once);
  });

  it("recordAttackForHints dismisses attack gate for dance hints", () => {
    const once = recordAttackForHints(fresh());
    expect(once.dismissedAttackHint).toBe(true);
    expect(recordAttackForHints(once)).toBe(once);
  });

  it("heal hint dismisses on any heal button press", () => {
    const wasted = recordHealForHints(fresh(), { armDance: false });
    expect(shouldShowHealHint(wasted, 8, 20, combat, true)).toBe(false);
    expect(shouldShowHealHint(wasted, 20, 20, combat, true)).toBe(false);
    expect(recordHealForHints(wasted)).toBe(wasted);
  });

  it("heal press clears dance hint for the current foe", () => {
    const armed = newFoeAfterKill(recordAttackForHints(fresh()));
    const afterHeal = recordHealForHints(armed);
    expect(afterHeal.showDanceHintThisFoe).toBe(false);
    expect(shouldShowDanceHint(afterHeal, 20, 20, combat, true, 0, 3, 0)).toBe(false);
  });

  it("dismissHealHint permanently dismisses after heal is used", () => {
    const after = dismissHealHint(fresh());
    expect(shouldShowHealHint(after, 8, 20, combat, true)).toBe(false);
    expect(after.pendingDanceHintAfterHeal).toBe(false);
  });

  it("heal hint returns when low again after topping up from a kill", () => {
    const topped = newFoeAfterKill(recordAttackForHints(fresh()), {
      hp: 20,
      maxHp: 20,
    });
    expect(shouldShowHealHint(topped, 20, 20, combat, true)).toBe(false);
    expect(shouldShowHealHint(topped, 10, 20, combat, true)).toBe(true);
  });

  it("heal hint hides while run is lethal even at low hp", () => {
    expect(shouldShowHealHint(fresh(), 10, 20, combat, true)).toBe(true);
    expect(shouldShowHealHint(fresh(), 3, 20, combat, true, 5, 0)).toBe(false);
    expect(shouldShowRunHint(fresh(), 3, 5, 0, combat, true)).toBe(true);
  });

  it("dance hint stops for this foe after dance and stays off for the run", () => {
    const armed = newFoeAfterKill(recordAttackForHints(fresh()));
    const danced = recordDanceForHints(armed);
    expect(shouldShowDanceHint(danced, 20, 20, combat, true, 0, 3, 0)).toBe(false);

    const next = newFoeAfterKill(danced);
    expect(shouldShowDanceHint(next, 20, 20, combat, true, 0, 3, 0)).toBe(false);
    expect(shouldShowDanceHint(next, 20, 20, combat, true, 1, 3, 0)).toBe(false);
  });

  it("attack clears dance hint for the current foe", () => {
    const armed = newFoeAfterKill(recordAttackForHints(fresh()));
    const afterAttack = recordAttackForHints(armed);
    expect(shouldShowDanceHint(afterAttack, 20, 20, combat, true, 0, 3, 0)).toBe(false);
  });

  it("run hint dismisses permanently after first run", () => {
    const after = recordRunForHints(fresh());
    expect(shouldShowRunHint(after, 1, 9, 0, combat, true)).toBe(false);
    expect(recordRunForHints(after)).toBe(after);
  });
});

describe("combat hints — dance until first hype", () => {
  it("never shows heal and dance together", () => {
    const afterAttack = recordAttackForHints(fresh());
    expect(hintSnapshot(afterAttack, { hp: 10 }).heal).toBe(true);
    expect(hintSnapshot(afterAttack, { hp: 10 }).dance).toBe(false);

    const armed = newFoeAfterKill(afterAttack);
    expect(hintSnapshot(armed, { hp: 20 }).dance).toBe(true);
    expect(hintSnapshot(armed, { hp: 10 }).dance).toBe(false);
  });

  it("arms dance on a new foe after a kill at full hp with 0 hype", () => {
    const armed = newFoeAfterKill(recordAttackForHints(fresh()));
    expect(armed.showDanceHintThisFoe).toBe(true);
    expect(shouldShowDanceHint(armed, 20, 20, combat, true, 0, 3, 0)).toBe(true);
    expect(shouldShowDanceHint(armed, 20, 20, combat, true, 1, 3, 0)).toBe(false);
    expect(shouldShowDanceHint(armed, 18, 20, combat, true, 0, 3, 0)).toBe(true);
  });

  it("does not arm dance before first attack or on the first foe", () => {
    expect(
      shouldArmDanceHintForNewFoe(fresh(), {
        hypeLevel: 0,
        hp: 20,
        maxHp: 20,
        wave: 1,
        viaKill: false,
      })
    ).toBe(false);
    expect(shouldShowDanceHint(fresh(), 20, 20, combat, true, 0, 3, 0)).toBe(false);
  });

  it("does not arm dance after run away before wave 12", () => {
    const afterFlee = newFoeAfterFlee(recordAttackForHints(fresh()));
    expect(afterFlee.showDanceHintThisFoe).toBe(false);
    expect(shouldShowDanceHint(afterFlee, 20, 20, combat, true, 0, 3, 0)).toBe(false);
  });

  it("re-arms dance on each kill until hype reaches 1", () => {
    let flags = newFoeAfterKill(recordAttackForHints(fresh()));
    expect(shouldShowDanceHint(flags, 20, 20, combat, true, 0, 3, 0)).toBe(true);

    flags = recordAttackForHints(flags);
    flags = newFoeAfterKill(flags);
    expect(shouldShowDanceHint(flags, 20, 20, combat, true, 0, 3, 0)).toBe(true);
  });

  it("yields to run hint while lethal on an armed foe", () => {
    const armed = newFoeAfterKill(recordAttackForHints(fresh()));
    expect(shouldShowDanceHint(armed, 3, 20, combat, true, 0, 5, 0)).toBe(false);
    expect(shouldShowRunHint(armed, 3, 5, 0, combat, true)).toBe(true);
  });

  it("run defer no longer blocks dance after a later kill top-up", () => {
    const fled = deferDanceHintAfterRun(newFoeAfterKill(recordAttackForHints(fresh())));
    expect(shouldShowDanceHint(fled, 12, 20, combat, true, 0, 3, 0)).toBe(false);

    const afterKill = newFoeAfterKill(fled, { hp: 20, maxHp: 20 });
    expect(shouldShowDanceHint(afterKill, 20, 20, combat, true, 0, 3, 0)).toBe(true);
  });

  it("run does not defer dance when none was queued", () => {
    const after = deferDanceHintAfterRun(fresh());
    expect(after.pendingDanceHintAfterVictory).toBe(false);
  });
});

describe("combat hints — dance wave 12 fallback", () => {
  it("does not clear defer flags before wave 12", () => {
    const deferred = deferDanceHintAfterRun(newFoeAfterKill(recordAttackForHints(fresh())));
    expect(maybeArmDanceHintForWave(deferred, 10).pendingDanceHintAfterVictory).toBe(true);
  });

  it("clears run-deferred state at wave 12", () => {
    const deferred = deferDanceHintAfterRun(newFoeAfterKill(recordAttackForHints(fresh())));
    expect(deferred.pendingDanceHintAfterVictory).toBe(true);

    const cleared = maybeArmDanceHintForWave(deferred, DANCE_HINT_FALLBACK_WAVE);
    expect(cleared.pendingDanceHintAfterVictory).toBe(false);
    expect(cleared.pendingDanceHintAfterHeal).toBe(false);
  });

  it("does not arm dance on run away at wave 11", () => {
    const armed = newFoeAfterFlee(recordAttackForHints(fresh()), { wave: 11 });
    expect(armed.showDanceHintThisFoe).toBe(false);
  });

  it("arms dance on a new foe at wave 12 even after run away", () => {
    const armed = newFoeAfterFlee(recordAttackForHints(fresh()), { wave: 12 });
    expect(armed.showDanceHintThisFoe).toBe(true);
    expect(shouldShowDanceHint(armed, 20, 20, combat, true, 0, 3, 0)).toBe(true);
  });

  it("run defer then kill still shows dance on the next full-hp foe", () => {
    let flags = newFoeAfterKill(recordAttackForHints(fresh()));
    flags = deferDanceHintAfterRun(flags);
    flags = onVictoryForHints(flags);
    flags = newFoeAfterKill(flags);
    expect(shouldShowDanceHint(flags, 20, 20, combat, true, 0, 3, 0)).toBe(true);
  });

  it("uses wave 12 as the dance fallback threshold", () => {
    expect(DANCE_HINT_FALLBACK_WAVE).toBe(12);
    expect(
      shouldArmDanceHintForNewFoe(recordAttackForHints(fresh()), {
        hypeLevel: 0,
        hp: 20,
        maxHp: 20,
        wave: 11,
        viaKill: false,
      })
    ).toBe(false);
    expect(
      shouldArmDanceHintForNewFoe(recordAttackForHints(fresh()), {
        hypeLevel: 0,
        hp: 20,
        maxHp: 20,
        wave: 12,
        viaKill: false,
      })
    ).toBe(true);
  });
});

describe("combat hints — dance arming edge cases", () => {
  const afterAttack = () => recordAttackForHints(fresh());

  it("does not arm when hype is already at least 1", () => {
    const next = onNextFoeForHints(afterAttack(), {
      hypeLevel: 1,
      hp: 20,
      maxHp: 20,
      wave: 2,
      viaKill: true,
    });
    expect(next.showDanceHintThisFoe).toBe(false);
  });

  it("does not arm after a kill when not at full hp", () => {
    const next = newFoeAfterKill(afterAttack(), { hp: 18, maxHp: 20 });
    expect(next.showDanceHintThisFoe).toBe(true);
  });

  it("clears an armed foe flag when entering a foe without arming context", () => {
    const armed = newFoeAfterKill(afterAttack());
    const cleared = onNextFoeForHints(armed);
    expect(cleared.showDanceHintThisFoe).toBe(false);
  });

  it("run press clears dance hint for the current foe", () => {
    const armed = newFoeAfterKill(afterAttack());
    const afterRun = recordRunForHints(armed);
    expect(afterRun.showDanceHintThisFoe).toBe(false);
    expect(shouldShowDanceHint(afterRun, 20, 20, combat, true, 0, 3, 0)).toBe(false);
  });

  it("heal press no longer sets pending dance after heal", () => {
    const afterHeal = recordHealForHints(afterAttack(), { armDance: true });
    expect(afterHeal.pendingDanceHintAfterHeal).toBe(false);
  });

  it("dismissDanceHintThisFoe only clears the active foe flag", () => {
    const armed = newFoeAfterKill(afterAttack());
    const cleared = dismissDanceHintThisFoe(armed);
    expect(cleared.showDanceHintThisFoe).toBe(false);
    expect(dismissDanceHintThisFoe(cleared)).toBe(cleared);
  });

  it("recordDanceForHints permanently dismisses future dance hints and teach popup", () => {
    const danced = recordDanceForHints(newFoeAfterKill(afterAttack()));
    expect(danced.dismissedDanceHint).toBe(true);
    expect(danced.dismissedDanceTeachCopy).toBe(true);
    expect(danced.showDanceHintThisFoe).toBe(false);
    const next = newFoeAfterKill(danced);
    expect(next.showDanceHintThisFoe).toBe(false);
  });

  it("shows dance teach copy once while the dance hint is active", () => {
    const armed = newFoeAfterKill(afterAttack());
    expect(
      shouldShowDanceTeachCopy(armed, true, "combat", true)
    ).toBe(true);
    expect(
      shouldShowDanceTeachCopy(dismissDanceTeachCopy(armed), true, "combat", true)
    ).toBe(false);
    expect(shouldShowDanceTeachCopy(armed, false, "combat", true)).toBe(false);
  });

  it("shows heal teach copy while the heal hint is active", () => {
    const flags = afterAttack();
    expect(shouldShowHealTeachCopy(flags, true, "combat", true)).toBe(true);
    expect(
      shouldShowHealTeachCopy(recordHealForHints(flags), true, "combat", true)
    ).toBe(false);
  });

  it("shows run teach copy while the run hint is active", () => {
    const flags = recordDanceForHints(newFoeAfterKill(afterAttack()));
    expect(shouldShowRunTeachCopy(flags, true, "combat", true)).toBe(true);
    expect(
      shouldShowRunTeachCopy(recordRunForHints(flags), true, "combat", true)
    ).toBe(false);
  });

  it("formats attack teach copy from campaign length", () => {
    expect(attackTeachText(100)).toBe("Defeat all 100 waves to win!");
  });

  it("uses plain and in teach copy strings", () => {
    expect(DANCE_TEACH_TEXT).toBe(
      "Dance may add HYPE — makes hits stronger, for you and/or the foe."
    );
    expect(RUN_TEACH_TEXT).toBe(
      "Run away — heal a little, face the next foe, and lose all HYPE."
    );
    expect(HEAL_TEACH_TEXT).toBe("Restore HP — foe will hit back.");
    for (const text of [DANCE_TEACH_TEXT, RUN_TEACH_TEXT, HEAL_TEACH_TEXT]) {
      expect(text).not.toMatch(/&/);
    }
  });
});

describe("combat hints — run hint lethality", () => {
  it("shows when hp is at or below max foe hit including hype", () => {
    expect(shouldShowRunHint(fresh(), 3, 3, 0, combat, true)).toBe(true);
    expect(shouldShowRunHint(fresh(), 4, 3, 0, combat, true)).toBe(false);
    expect(shouldShowRunHint(fresh(), 2, 2, 1, combat, true)).toBe(true);
  });

  it("can return after healing if still lethal and run unused", () => {
    let flags = fresh();
    expect(shouldShowRunHint(flags, 3, 5, 0, combat, true)).toBe(true);
    flags = recordHealForHints(flags);
    expect(shouldShowRunHint(flags, 8, 5, 0, combat, true)).toBe(false);
    expect(shouldShowRunHint(flags, 4, 5, 0, combat, true)).toBe(true);
  });

  it("hides at 0 hp and outside combat", () => {
    expect(shouldShowRunHint(fresh(), 0, 9, 0, combat, true)).toBe(false);
    expect(shouldShowRunHint(fresh(), 3, 3, 0, "gameover", true)).toBe(false);
  });
});

describe("combat hints — teach flashes", () => {
  it("player damage flash fires once per run", () => {
    expect(recordPlayerDamageForHints(fresh()).flashHp).toBe(true);
    const after = recordPlayerDamageForHints(fresh()).flags;
    expect(recordPlayerDamageForHints(after).flashHp).toBe(false);
  });

  it("player hype flash only when displayed hype is at least 1", () => {
    expect(tryCelebrateFirstPlayerHype(fresh(), 0).flashFirstHype).toBe(false);
    expect(tryCelebrateFirstPlayerHype(fresh(), 1).flashFirstHype).toBe(true);
    const after = tryCelebrateFirstPlayerHype(fresh(), 1).flags;
    expect(tryCelebrateFirstPlayerHype(after, 1).flashFirstHype).toBe(false);
    expect(tryCelebrateFirstPlayerHype(after, 2).flashFirstHype).toBe(false);
  });

  it("foe hype flash only when displayed hype is at least 1", () => {
    expect(tryCelebrateFirstFoeHype(fresh(), 0).flashFirstHype).toBe(false);
    expect(tryCelebrateFirstFoeHype(fresh(), 1).flashFirstHype).toBe(true);
    const after = tryCelebrateFirstFoeHype(fresh(), 1).flags;
    expect(tryCelebrateFirstFoeHype(after, 0).flashFirstHype).toBe(false);
  });

  it("player and foe hype flashes are independent", () => {
    const foeFirst = tryCelebrateFirstFoeHype(fresh(), 1);
    expect(foeFirst.flashFirstHype).toBe(true);

    const playerSecond = tryCelebrateFirstPlayerHype(foeFirst.flags, 1);
    expect(playerSecond.flashFirstHype).toBe(true);
  });

  it("counter at 0 hype does not trigger first-hype flash", () => {
    let flags = fresh();
    flags = tryCelebrateFirstPlayerHype(flags, 0).flags;
    expect(tryCelebrateFirstPlayerHype(flags, 0).flashFirstHype).toBe(false);
    expect(flags.celebratedFirstPlayerHype).toBe(false);
  });

  it("counter at 0 hype never reaches 1 for first-hype flash", () => {
    expect(hypeAfterCounterHit(0, true)).toBe(0);
    expect(
      tryCelebrateFirstPlayerHype(fresh(), hypeAfterCounterHit(0, true)).flashFirstHype
    ).toBe(false);
  });

  it("first player hype flash fires once at hype 1", () => {
    const healed = tryCelebrateFirstPlayerHype(fresh(), 1);
    expect(healed.flashFirstHype).toBe(true);
    expect(tryCelebrateFirstPlayerHype(healed.flags, 1).flashFirstHype).toBe(false);
  });

  it("max hype blinks on each reach and stays highlighted while capped", () => {
    expect(hypeMaxPresentation(4, 5)).toEqual({ atMax: true, flashReachedMax: true });
    expect(hypeMaxPresentation(5, 5)).toEqual({ atMax: true, flashReachedMax: false });
    expect(hypeMaxPresentation(5, 4)).toEqual({ atMax: false, flashReachedMax: false });
    expect(hypeMaxPresentation(3, 5)).toEqual({ atMax: true, flashReachedMax: true });
    expect(hypeMaxPresentation(5, 5)).toEqual({ atMax: true, flashReachedMax: false });
  });

  it("first wave victory heal flash fires once on first mob kill top-up", () => {
    expect(tryCelebrateFirstWaveVictoryHeal(fresh(), 1, 8, 20).flashHp).toBe(true);
    const after = tryCelebrateFirstWaveVictoryHeal(fresh(), 1, 8, 20).flags;
    expect(tryCelebrateFirstWaveVictoryHeal(after, 1, 8, 20).flashHp).toBe(false);
    expect(tryCelebrateFirstWaveVictoryHeal(fresh(), 2, 8, 20).flashHp).toBe(false);
    expect(tryCelebrateFirstWaveVictoryHeal(fresh(), 1, 20, 20).flashHp).toBe(false);
  });
});

describe("combat hints — full first-run tutorial flow", () => {
  it("walks attack → damage → heal → next foe dance → run lethal", () => {
    let flags = fresh();

    expect(hintSnapshot(flags)).toEqual({
      heal: false,
      dance: false,
      run: false,
    });

    flags = recordAttackForHints(flags);
    flags = recordPlayerDamageForHints(flags).flags;
    expect(hintSnapshot(flags, { hp: 10 })).toEqual({
      heal: true,
      dance: false,
      run: false,
    });

    flags = recordHealForHints(flags);
    expect(hintSnapshot(flags, { hp: 18 })).toEqual({
      heal: false,
      dance: false,
      run: false,
    });

    flags = newFoeAfterKill(flags, { hp: 20, maxHp: 20 });
    expect(hintSnapshot(flags, { hp: 20 })).toEqual({
      heal: false,
      dance: true,
      run: false,
    });

    flags = recordDanceForHints(flags);
    expect(hintSnapshot(flags, { hp: 3, foeAtk: 5 })).toEqual({
      heal: false,
      dance: false,
      run: true,
    });

    expect(hintSnapshot(flags, { hp: 20, hype: 0 })).toEqual({
      heal: false,
      dance: false,
      run: false,
    });

    flags = newFoeAfterKill(flags, { hp: 20, maxHp: 20 });
    expect(hintSnapshot(flags, { hp: 20, hype: 0 })).toEqual({
      heal: false,
      dance: false,
      run: false,
    });

    flags = tryCelebrateFirstPlayerHype(flags, 1).flags;
    expect(hintSnapshot(flags, { hp: 20, hype: 1 })).toEqual({
      heal: false,
      dance: false,
      run: false,
    });

    flags = recordRunForHints(flags);
    expect(hintSnapshot(flags, { hp: 1, foeAtk: 9 })).toEqual({
      heal: false,
      dance: false,
      run: false,
    });
  });
});

describe("combat hints — persistence and migration", () => {
  it("persists full hint state in snapshots", () => {
    const flags = newFoeAfterKill(recordAttackForHints(fresh()));
    const snap = combatHintsForSnapshot(flags);
    const restored = createCombatHintsState(snap);
    expect(restored).toEqual(flags);
  });

  it("keeps armed dance hint flags through mid-run restore", () => {
    const armed = newFoeAfterKill(recordAttackForHints(fresh()));
    const snap = combatHintsForSnapshot(armed);
    const restored = combatHintsAfterMidRunRestore(
      createCombatHintsState(snap),
      0,
      0
    );
    expect(restored.showDanceHintThisFoe).toBe(true);
    expect(shouldShowDanceHint(restored, 20, 20, combat, true, 0, 3, 0)).toBe(true);
  });

  it("skips hype teach flags on mid-run restore when hype was already earned", () => {
    const restored = combatHintsAfterMidRunRestore(fresh(), 2, 1);
    expect(restored.celebratedFirstPlayerHype).toBe(true);
    expect(restored.celebratedFirstFoeHype).toBe(true);
    expect(tryCelebrateFirstPlayerHype(restored, 2).flashFirstHype).toBe(false);
    expect(tryCelebrateFirstFoeHype(restored, 1).flashFirstHype).toBe(false);
  });

  it("migrates legacy has-used flags from old saves", () => {
    const migrated = createCombatHintsState({ hasUsedDance: true, hasUsedHeal: true });
    expect(migrated.dismissedDanceHint).toBe(true);
    expect(migrated.dismissedHealHint).toBe(true);
    expect(migrated.celebratedFirstPlayerHype).toBe(true);
    expect(migrated.celebratedFirstFoeHype).toBe(false);
    expect(hintSnapshot(migrated, { hp: 10 }).heal).toBe(false);
    expect(hintSnapshot(migrated, { hp: 10 }).dance).toBe(false);
  });

  it("hides dance at max hype even when foe flag is set", () => {
    const primed = newFoeAfterKill(recordAttackForHints(fresh()));
    expect(shouldShowDanceHint(primed, 20, 20, combat, true, 5, 3, 0)).toBe(false);
  });
});
