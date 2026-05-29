/** Foe counter / dance follow-up after hero attack, heal, or dance. */
export const FOE_FOLLOW_UP_DELAY_MS = 200;

export type CombatPhase = "combat" | "gameover" | "victory";

export type CombatGateState = {
  phase: CombatPhase;
  combatBusy: boolean;
  awaitingFoeResponse: boolean;
  combatActionGeneration: number;
  playerHp: number;
  hasFoe: boolean;
};

export function createCombatGateState(
  overrides: Partial<CombatGateState> = {}
): CombatGateState {
  return {
    phase: "combat",
    combatBusy: false,
    awaitingFoeResponse: false,
    combatActionGeneration: 0,
    playerHp: 20,
    hasFoe: true,
    ...overrides,
  };
}

export function canUseCombatActions(state: CombatGateState): boolean {
  return (
    state.phase === "combat" &&
    !state.combatBusy &&
    !state.awaitingFoeResponse &&
    state.playerHp > 0 &&
    state.hasFoe
  );
}

export function tryLockCombat(
  state: CombatGateState
): { ok: true; generation: number; state: CombatGateState } | { ok: false } {
  if (!canUseCombatActions(state)) {
    return { ok: false };
  }
  const generation = state.combatActionGeneration + 1;
  return {
    ok: true,
    generation,
    state: {
      ...state,
      combatBusy: true,
      combatActionGeneration: generation,
    },
  };
}

export function finishCombatAction(
  generation: number,
  state: CombatGateState
): CombatGateState {
  if (generation !== state.combatActionGeneration) {
    return state;
  }
  return {
    ...state,
    combatBusy: false,
    awaitingFoeResponse: false,
  };
}

export function beginAwaitingFoeResponse(state: CombatGateState): CombatGateState {
  return { ...state, awaitingFoeResponse: true };
}

export function blockCombatForScreenEnd(state: CombatGateState): CombatGateState {
  return {
    ...state,
    combatBusy: true,
    awaitingFoeResponse: true,
    combatActionGeneration: state.combatActionGeneration + 1,
  };
}

export function resetCombatGate(state: CombatGateState): CombatGateState {
  return {
    ...state,
    combatBusy: false,
    awaitingFoeResponse: false,
    combatActionGeneration: state.combatActionGeneration + 1,
  };
}

/** Whether attack/heal should expect a foe counter this exchange. */
export function shouldAwaitFoeCounter(foeHpAfterHit: number): boolean {
  return foeHpAfterHit > 0;
}

export function foeFollowUpDelayMs(foeParticipates: boolean): number {
  return foeParticipates ? FOE_FOLLOW_UP_DELAY_MS : 0;
}

export function isFollowUpTimerStale(
  generation: number,
  state: CombatGateState,
  phase: CombatPhase
): boolean {
  return generation !== state.combatActionGeneration || phase !== "combat";
}
