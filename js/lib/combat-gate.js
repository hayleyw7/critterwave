/** Foe counter / dance follow-up after hero attack, heal, or dance. */
export const FOE_FOLLOW_UP_DELAY_MS = 200;
export function createCombatGateState(overrides = {}) {
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
export function canUseCombatActions(state) {
    return (state.phase === "combat" &&
        !state.combatBusy &&
        !state.awaitingFoeResponse &&
        state.playerHp > 0 &&
        state.hasFoe);
}
export function tryLockCombat(state) {
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
export function finishCombatAction(generation, state) {
    if (generation !== state.combatActionGeneration) {
        return state;
    }
    return {
        ...state,
        combatBusy: false,
        awaitingFoeResponse: false,
    };
}
export function beginAwaitingFoeResponse(state) {
    return { ...state, awaitingFoeResponse: true };
}
export function blockCombatForScreenEnd(state) {
    return {
        ...state,
        combatBusy: true,
        awaitingFoeResponse: true,
        combatActionGeneration: state.combatActionGeneration + 1,
    };
}
export function resetCombatGate(state) {
    return {
        ...state,
        combatBusy: false,
        awaitingFoeResponse: false,
        combatActionGeneration: state.combatActionGeneration + 1,
    };
}
/** Whether attack/heal should expect a foe counter this exchange. */
export function shouldAwaitFoeCounter(foeHpAfterHit) {
    return foeHpAfterHit > 0;
}
export function foeFollowUpDelayMs(foeParticipates) {
    return foeParticipates ? FOE_FOLLOW_UP_DELAY_MS : 0;
}
export function isFollowUpTimerStale(generation, state, phase) {
    return generation !== state.combatActionGeneration || phase !== "combat";
}
