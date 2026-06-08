import {
  tryCelebrateFirstFoeHype,
  tryCelebrateFirstPlayerHype,
  hypeMaxPresentation,
} from "../lib/combat-hints.js";
import {
  HYPE_MAX,
  applyHypeGain,
  hypeAfterTakingHit,
  clampHype,
  formatHypeLabel as formatHypeStatLabel,
} from "../lib/game-logic.js";
import { HP_TEACH_FLASH_MS, HYPE_METER_FLASH_MS } from "./constants.js";
import { el } from "./dom.js";
import { gameState } from "./state.js";
import { setHpBar } from "./ui-bars.js";

export function applyPlayerDanceBuff(amount = 1): void {
  gainPlayerHype(amount);
}

export function applyFoeDanceBuff(amount = 1): void {
  gainFoeHype(amount);
}

export function formatHypeAriaLabel(level: number): string {
  const clamped = clampHype(level);
  return `HYPE ${clamped} of ${HYPE_MAX}`;
}

export function clearAllHype(): void {
  gameState.hypeLevel = 0;
  gameState.foeHypeLevel = 0;
  gameState.displayedPlayerHype = 0;
  gameState.displayedFoeHype = 0;
}

export function syncHypeMaxPresentation(
  wrap: HTMLElement,
  level: number,
  side: "player" | "foe"
): void {
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
  } else {
    gameState.displayedFoeHype = clamped;
  }
}

export function applyPlayerHitHypeLoss(damageDealt: number): void {
  gameState.hypeLevel = hypeAfterTakingHit(gameState.hypeLevel, damageDealt);
}

export function applyFoeHitHypeLoss(damageDealt: number): void {
  gameState.foeHypeLevel = hypeAfterTakingHit(gameState.foeHypeLevel, damageDealt);
}

export function renderHypeMeter(
  wrap: HTMLElement,
  statusPanel: HTMLElement,
  bar: HTMLElement,
  fill: HTMLElement,
  label: HTMLElement,
  level: number,
  side: "player" | "foe"
): void {
  const clamped = clampHype(level);
  label.textContent = formatHypeStatLabel(clamped);
  label.setAttribute("aria-label", formatHypeAriaLabel(clamped));
  setHpBar(fill, clamped, HYPE_MAX);
  bar.setAttribute("aria-valuenow", String(clamped));
  bar.setAttribute("aria-valuemax", String(HYPE_MAX));
  statusPanel.classList.toggle("hype-full", clamped >= HYPE_MAX);
  syncHypeMaxPresentation(wrap, level, side);
}

export function playFirstHypeFlash(wrap: HTMLElement): void {
  wrap.classList.add("hype-first-dance-flash");
  window.setTimeout(() => {
    wrap.classList.remove("hype-first-dance-flash");
  }, HYPE_METER_FLASH_MS);
}

export function gainPlayerHype(amount: number): void {
  if (amount <= 0) {
    return;
  }
  gameState.hypeLevel = applyHypeGain(gameState.hypeLevel, amount);
}

export function gainFoeHype(amount: number): void {
  if (amount <= 0) {
    return;
  }
  gameState.foeHypeLevel = applyHypeGain(gameState.foeHypeLevel, amount);
}

export function syncFirstHypeFlashes(): void {
  if (gameState.suppressTeachFlashesThisRender) {
    return;
  }

  const skipPlayer = gameState.skipPlayerHypeTeachThisRender;
  gameState.skipPlayerHypeTeachThisRender = false;

  if (!skipPlayer) {
    const playerHypeResult = tryCelebrateFirstPlayerHype(
      gameState.combatHints,
      gameState.hypeLevel
    );
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

export function playHpBarTeachFlash(fill: HTMLElement, className: string): void {
  const bar = fill.parentElement;
  if (!bar) {
    return;
  }
  bar.classList.remove(className);
  void bar.offsetWidth;
  bar.classList.add(className);
  window.setTimeout(() => bar.classList.remove(className), HP_TEACH_FLASH_MS);
}

export function playFirstHealHpFlash(): void {
  playHpBarTeachFlash(el.playerHpFill, "hp-first-heal-flash");
}

export function playFirstPlayerDamageHpFlash(): void {
  playHpBarTeachFlash(el.playerHpFill, "hp-first-damage-flash");
}

export function playFirstAttackFoeHpFlash(): void {
  playHpBarTeachFlash(el.foeHpFill, "hp-first-attack-flash");
}

export function playFirstWaveVictoryHealHpFlash(): void {
  playHpBarTeachFlash(el.playerHpFill, "hp-first-wave-heal-flash");
}
