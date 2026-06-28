import { xpProgressForWave } from "../lib/game-logic.js";
import {
  DANCE_ANIM_MS,
  DEATH_BEAT_MS,
  FOE_ENTRANCE_MS,
  FOE_POOF_MS,
  GOLD_FLASH_MS,
  HEAL_ANIM_MS,
  LEVEL_UP_NOTICE_MS,
  XP_FILL_BEAT_MS,
} from "./constants.js";
import { sfxDeath, sfxEntrance, sfxFlee, sfxFoeDefeated, sfxHeal, sfxLevelUp } from "./audio.js";
import { el } from "./dom.js";
import { gameState } from "./state.js";
import { setHpBar } from "./ui-bars.js";

export function pause(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function briefClass(element: HTMLElement, className: string, ms: number): void {
  if (gameState.debugInstantTransitions) {
    return;
  }
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
  window.setTimeout(() => element.classList.remove(className), ms);
}

export function playStageClass(className: string, ms: number): Promise<void> {
  if (gameState.debugInstantTransitions) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    el.battleStage.classList.remove(className);
    void el.battleStage.offsetWidth;
    el.battleStage.classList.add(className);
    window.setTimeout(() => {
      el.battleStage.classList.remove(className);
      resolve();
    }, ms);
  });
}

export function clearCombatAnimations(): void {
  el.playerPanel.classList.remove(
    "hero-death",
    "hero-death-knockback",
    "hero-victory-wobble",
    "hero-heal",
    "hero-dance"
  );
  el.foePanel.classList.remove("foe-poof", "foe-enter", "foe-dance", "foe-sprite-hidden");
  clearHitReact(el.playerPanel);
  clearHitReact(el.foePanel);
  el.battleStage.classList.remove("stage-death-vignette", "stage-flash-gold");
}

export function clearHitReact(panel: HTMLElement): void {
  panel
    .querySelector(".emoji-stack")
    ?.classList.remove(
      "hero-took-hit",
      "hero-took-hit-fatal",
      "foe-took-hit",
      "foe-took-hit-fatal",
      "hero-lunge",
      "foe-lunge"
    );
  panel
    .querySelector(".hit-mark")
    ?.classList.remove("hit-mark-active", "hit-mark-active-kill");
}

export function playHeroHeal(): Promise<void> {
  sfxHeal();
  if (gameState.debugInstantTransitions) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    el.playerPanel.classList.remove("hero-heal");
    void el.playerPanel.offsetWidth;
    el.playerPanel.classList.add("hero-heal");
    window.setTimeout(() => {
      el.playerPanel.classList.remove("hero-heal");
      resolve();
    }, HEAL_ANIM_MS);
  });
}

export function playHeroDance(): void {
  briefClass(el.playerPanel, "hero-dance", DANCE_ANIM_MS);
}

export function playFoeDance(): void {
  briefClass(el.foePanel, "foe-dance", DANCE_ANIM_MS);
}

export async function playRunExit(): Promise<void> {
  sfxFlee();
  await playFoePoof();
}

export function playRunEntrance(): void {
  playFoeEntrance();
}

export function playFoeEntrance(): void {
  if (gameState.debugInstantTransitions) {
    return;
  }
  sfxEntrance();
  el.foePanel.classList.remove("foe-sprite-hidden");
  briefClass(el.foePanel, "foe-enter", FOE_ENTRANCE_MS);
}

export function playFoePoof(): Promise<void> {
  if (gameState.debugInstantTransitions) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    el.foePanel.classList.remove("foe-poof", "foe-sprite-hidden");
    void el.foePanel.offsetWidth;
    el.foePanel.classList.add("foe-poof");
    window.setTimeout(() => {
      el.foePanel.classList.remove("foe-poof");
      el.foePanel.classList.add("foe-sprite-hidden");
      resolve();
    }, FOE_POOF_MS);
  });
}

export async function playFoeDefeat(isFinal: boolean): Promise<void> {
  if (gameState.debugInstantTransitions) {
    return;
  }
  sfxFoeDefeated(isFinal);
  if (isFinal) {
    await Promise.all([playFoePoof(), playStageClass("stage-flash-gold", GOLD_FLASH_MS)]);
    briefClass(el.playerPanel, "hero-victory-wobble", 450);
    await pause(350);
    return;
  }
  await playFoePoof();
}

export async function handlePlayerDeath(): Promise<void> {
  await pause(420);
  sfxDeath();
  el.playerPanel.classList.add("hero-death");
  await playStageClass("stage-death-vignette", DEATH_BEAT_MS);
}

export function spritePopAnchor(side: "hero" | "foe"): { left: string; top: string } {
  const panel = side === "hero" ? el.playerPanel : el.foePanel;
  const stack = panel.querySelector<HTMLElement>(".sprite-wrap .emoji-stack");
  const layerRect = el.damageLayer.getBoundingClientRect();
  if (!stack || layerRect.width <= 0 || layerRect.height <= 0) {
    const fallbackLeft = side === "hero" ? 22 : 78;
    return { left: `${fallbackLeft}%`, top: "42%" };
  }
  const stackRect = stack.getBoundingClientRect();
  const centerX =
    ((stackRect.left + stackRect.width / 2 - layerRect.left) / layerRect.width) * 100;
  const gapAbove = Math.max(32, stackRect.height * 0.78);
  const anchorY = ((stackRect.top - gapAbove - layerRect.top) / layerRect.height) * 100;
  return { left: `${centerX}%`, top: `${anchorY}%` };
}

export function showDamagePop(
  side: "hero" | "foe",
  text: string,
  kind: "damage" | "heal" | "hype",
  anchorOverride?: { left: string; top: string }
): void {
  const pop = document.createElement("span");
  pop.className =
    kind === "heal"
      ? "damage-pop heal-pop"
      : kind === "hype"
        ? "damage-pop hype-pop"
        : "damage-pop";
  pop.textContent = text;
  const anchor = anchorOverride ?? spritePopAnchor(side);
  pop.style.left = anchor.left;
  pop.style.top = anchor.top;
  el.damageLayer.appendChild(pop);
  void pop.offsetWidth;
  window.setTimeout(() => pop.remove(), 900);
}

export function playLevelUpNotice(level: number): Promise<void> {
  sfxLevelUp();
  if (gameState.debugInstantTransitions) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const pop = document.createElement("span");
    pop.className = "level-up-pop";
    pop.textContent = `Level ${level}`;
    pop.setAttribute("role", "status");
    el.heroLevelUpLayer.setAttribute("aria-hidden", "false");
    el.heroLevelUpLayer.appendChild(pop);
    void pop.offsetWidth;
    window.setTimeout(() => {
      pop.remove();
      el.heroLevelUpLayer.setAttribute("aria-hidden", "true");
      resolve();
    }, LEVEL_UP_NOTICE_MS);
  });
}

export function playXpBarFullBeat(): Promise<void> {
  if (gameState.debugInstantTransitions) {
    const { max } = xpProgressForWave(gameState.wave);
    setHpBar(el.xpFill, max, max);
    el.xpText.textContent = "100%";
    el.xpBar.setAttribute("aria-valuenow", String(max));
    el.xpBar.setAttribute("aria-valuemax", String(max));
    return Promise.resolve();
  }
  const { max } = xpProgressForWave(gameState.wave);
  setHpBar(el.xpFill, max, max);
  el.xpText.textContent = "100%";
  el.xpBar.setAttribute("aria-valuenow", String(max));
  el.xpBar.setAttribute("aria-valuemax", String(max));
  return pause(XP_FILL_BEAT_MS);
}
