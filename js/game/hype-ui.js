import { tryCelebrateFirstFoeHype, tryCelebrateFirstPlayerHype, hypeMaxPresentation, } from "../lib/combat-hints.js";
import { HYPE_MAX, applyHypeGain, hypeAfterTakingHit, clampHype, formatHypeLabel as formatHypeStatLabel, } from "../lib/game-logic.js";
import { HP_TEACH_FLASH_MS, HYPE_METER_FLASH_MS } from "./constants.js";
import { el } from "./dom.js";
import { gameState } from "./state.js";
import { setHpBar } from "./ui-bars.js";
export function applyPlayerDanceBuff(amount = 1) {
    gainPlayerHype(amount);
}
export function applyFoeDanceBuff(amount = 1) {
    gainFoeHype(amount);
}
export function formatHypeAriaLabel(level) {
    const clamped = clampHype(level);
    return `HYPE ${clamped} of ${HYPE_MAX}`;
}
export function clearAllHype() {
    gameState.hypeLevel = 0;
    gameState.foeHypeLevel = 0;
    gameState.displayedPlayerHype = 0;
    gameState.displayedFoeHype = 0;
}
export function syncHypeMaxPresentation(wrap, level, side) {
    const previous = side === "player" ? gameState.displayedPlayerHype : gameState.displayedFoeHype;
    const pres = hypeMaxPresentation(previous, level);
    wrap.classList.toggle("hype-maxed", pres.atMax);
    if (pres.flashReachedMax && !gameState.suppressTeachFlashesThisRender) {
        wrap.classList.remove("hype-maxed-flash");
        void wrap.offsetWidth;
        wrap.classList.add("hype-maxed-flash");
        window.setTimeout(() => wrap.classList.remove("hype-maxed-flash"), HYPE_METER_FLASH_MS);
    }
    const clamped = clampHype(level);
    if (side === "player") {
        gameState.displayedPlayerHype = clamped;
    }
    else {
        gameState.displayedFoeHype = clamped;
    }
}
export function applyPlayerHitHypeLoss(damageDealt) {
    gameState.hypeLevel = hypeAfterTakingHit(gameState.hypeLevel, damageDealt);
}
export function applyFoeHitHypeLoss(damageDealt) {
    gameState.foeHypeLevel = hypeAfterTakingHit(gameState.foeHypeLevel, damageDealt);
}
export function renderHypeMeter(wrap, statusPanel, bar, fill, label, level, side) {
    const clamped = clampHype(level);
    label.textContent = formatHypeStatLabel(clamped);
    label.setAttribute("aria-label", formatHypeAriaLabel(clamped));
    setHpBar(fill, clamped, HYPE_MAX);
    bar.setAttribute("aria-valuenow", String(clamped));
    bar.setAttribute("aria-valuemax", String(HYPE_MAX));
    statusPanel.classList.toggle("hype-full", clamped >= HYPE_MAX);
    syncHypeMaxPresentation(wrap, level, side);
}
export function playFirstHypeFlash(wrap) {
    wrap.classList.add("hype-first-dance-flash");
    window.setTimeout(() => {
        wrap.classList.remove("hype-first-dance-flash");
    }, HYPE_METER_FLASH_MS);
}
export function gainPlayerHype(amount) {
    if (amount <= 0) {
        return;
    }
    gameState.hypeLevel = applyHypeGain(gameState.hypeLevel, amount);
}
export function gainFoeHype(amount) {
    if (amount <= 0) {
        return;
    }
    gameState.foeHypeLevel = applyHypeGain(gameState.foeHypeLevel, amount);
}
export function syncFirstHypeFlashes() {
    if (gameState.suppressTeachFlashesThisRender) {
        return;
    }
    const skipPlayer = gameState.skipPlayerHypeTeachThisRender;
    gameState.skipPlayerHypeTeachThisRender = false;
    if (!skipPlayer) {
        const playerHypeResult = tryCelebrateFirstPlayerHype(gameState.combatHints, gameState.hypeLevel);
        gameState.combatHints = playerHypeResult.flags;
        if (playerHypeResult.flashFirstHype) {
            playFirstHypeFlash(el.playerHypeWrap);
        }
    }
    const foeHypeResult = tryCelebrateFirstFoeHype(gameState.combatHints, gameState.foeHypeLevel);
    gameState.combatHints = foeHypeResult.flags;
    if (foeHypeResult.flashFirstHype) {
        playFirstHypeFlash(el.foeHypeWrap);
    }
}
export function playHpBarTeachFlash(fill, className) {
    const bar = fill.parentElement;
    if (!bar) {
        return;
    }
    bar.classList.remove(className);
    void bar.offsetWidth;
    bar.classList.add(className);
    window.setTimeout(() => bar.classList.remove(className), HP_TEACH_FLASH_MS);
}
export function playFirstHealHpFlash() {
    playHpBarTeachFlash(el.playerHpFill, "hp-first-heal-flash");
}
export function playFirstPlayerDamageHpFlash() {
    playHpBarTeachFlash(el.playerHpFill, "hp-first-damage-flash");
}
export function playFirstAttackFoeHpFlash() {
    playHpBarTeachFlash(el.foeHpFill, "hp-first-attack-flash");
}
export function playFirstWaveVictoryHealHpFlash() {
    playHpBarTeachFlash(el.playerHpFill, "hp-first-wave-heal-flash");
}
