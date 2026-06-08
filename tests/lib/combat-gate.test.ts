import { describe, expect, it } from "vitest";
import {
  beginAwaitingFoeResponse,
  blockCombatForScreenEnd,
  canUseCombatActions,
  createCombatGateState,
  finishCombatAction,
  FOE_FOLLOW_UP_DELAY_MS,
  foeFollowUpDelayMs,
  isFollowUpTimerStale,
  resetCombatGate,
  shouldAwaitFoeCounter,
  tryLockCombat,
} from "../../src/lib/combat-gate.js";

describe("combat gate", () => {
  it("allows actions only in combat when idle and alive with a foe", () => {
    expect(canUseCombatActions(createCombatGateState())).toBe(true);
    expect(canUseCombatActions(createCombatGateState({ combatBusy: true }))).toBe(false);
    expect(
      canUseCombatActions(createCombatGateState({ awaitingFoeResponse: true }))
    ).toBe(false);
    expect(canUseCombatActions(createCombatGateState({ playerHp: 0 }))).toBe(false);
    expect(canUseCombatActions(createCombatGateState({ hasFoe: false }))).toBe(false);
    expect(canUseCombatActions(createCombatGateState({ phase: "gameover" }))).toBe(false);
    expect(canUseCombatActions(createCombatGateState({ phase: "victory" }))).toBe(false);
  });

  it("locks combat with an incremented generation", () => {
    const base = createCombatGateState();
    const locked = tryLockCombat(base);
    expect(locked.ok).toBe(true);
    if (!locked.ok) return;
    expect(locked.generation).toBe(1);
    expect(locked.state.combatBusy).toBe(true);
    expect(locked.state.combatActionGeneration).toBe(1);
    expect(canUseCombatActions(locked.state)).toBe(false);
  });

  it("rejects a second lock while busy", () => {
    const first = tryLockCombat(createCombatGateState());
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(tryLockCombat(first.state).ok).toBe(false);
  });

  it("blocks actions after awaiting a foe counter", () => {
    const locked = tryLockCombat(createCombatGateState());
    expect(locked.ok).toBe(true);
    if (!locked.ok) return;
    const awaiting = beginAwaitingFoeResponse(locked.state);
    expect(canUseCombatActions(awaiting)).toBe(false);
    expect(awaiting.awaitingFoeResponse).toBe(true);
  });

  it("finishes only matching generations", () => {
    const locked = tryLockCombat(createCombatGateState());
    expect(locked.ok).toBe(true);
    if (!locked.ok) return;
    const awaiting = beginAwaitingFoeResponse(locked.state);
    const done = finishCombatAction(locked.generation, awaiting);
    expect(done.combatBusy).toBe(false);
    expect(done.awaitingFoeResponse).toBe(false);
    expect(canUseCombatActions(done)).toBe(true);

    const stale = finishCombatAction(locked.generation - 1, awaiting);
    expect(stale.combatBusy).toBe(true);
    expect(stale.awaitingFoeResponse).toBe(true);
  });

  it("blocks and bumps generation on end screens", () => {
    const ended = blockCombatForScreenEnd(createCombatGateState());
    expect(ended.combatBusy).toBe(true);
    expect(ended.awaitingFoeResponse).toBe(true);
    expect(ended.combatActionGeneration).toBe(1);
    expect(canUseCombatActions(ended)).toBe(false);
  });

  it("resets busy flags and bumps generation for a new run", () => {
    const stuck = createCombatGateState({
      combatBusy: true,
      awaitingFoeResponse: true,
      combatActionGeneration: 3,
    });
    const reset = resetCombatGate(stuck);
    expect(reset.combatBusy).toBe(false);
    expect(reset.awaitingFoeResponse).toBe(false);
    expect(reset.combatActionGeneration).toBe(4);
  });

  it("requires a foe counter only when the foe survives", () => {
    expect(shouldAwaitFoeCounter(5)).toBe(true);
    expect(shouldAwaitFoeCounter(0)).toBe(false);
  });

  it("uses the shared follow-up delay for counters and dance", () => {
    expect(FOE_FOLLOW_UP_DELAY_MS).toBe(200);
    expect(foeFollowUpDelayMs(true)).toBe(200);
    expect(foeFollowUpDelayMs(false)).toBe(0);
  });

  it("treats stale timers as expired when generation or phase changed", () => {
    const state = createCombatGateState({ combatActionGeneration: 2 });
    expect(isFollowUpTimerStale(2, state, "combat")).toBe(false);
    expect(isFollowUpTimerStale(1, state, "combat")).toBe(true);
    expect(isFollowUpTimerStale(2, state, "gameover")).toBe(true);
  });
});
