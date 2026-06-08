import {
  shouldShowAttackHint,
  shouldShowDanceHint,
  shouldShowDanceTeachCopy,
  shouldShowHealHint,
  shouldShowHealTeachCopy,
  shouldShowRunHint,
  shouldShowRunTeachCopy,
} from "../lib/combat-hints.js";
import { MOBILE_TEACH_LAYOUT_MQ } from "./constants.js";
import { el } from "./dom.js";
import { gameState } from "./state.js";
import type { CombatTeachPopupId } from "./types.js";

export function clearFooterTeachPopupPosition(popup: HTMLElement): void {
  popup.style.left = "";
  popup.style.top = "";
  popup.style.right = "";
  popup.style.bottom = "";
  popup.style.transform = "";
  popup.style.maxWidth = "";
  popup.style.removeProperty("--teach-arrow-offset");
  popup.style.removeProperty("--teach-arrow-offset-end");
}

export function teachPopupGapPx(): number {
  const raw = getComputedStyle(el.gameShell).getPropertyValue("--space-2").trim();
  if (raw.endsWith("rem")) {
    const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize);
    return parseFloat(raw) * rootPx;
  }
  return parseFloat(raw) || 0;
}

export function teachPopupArrowPx(): number {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--cmd-teach-arrow-size")
    .trim();
  return parseFloat(raw) || 7;
}

export function teachPopupMaxWidthForLayout(): string | null {
  if (!MOBILE_TEACH_LAYOUT_MQ.matches) {
    return null;
  }
  return `${window.innerWidth * 0.8}px`;
}

export function positionFooterTeachPopup(popup: HTMLElement, btn: HTMLElement): void {
  const shell = el.gameShell.getBoundingClientRect();
  const btnRect = btn.getBoundingClientRect();
  const gap = teachPopupGapPx();
  const arrow = teachPopupArrowPx();
  const margin = 8;

  popup.style.position = "fixed";
  popup.style.inset = "auto";
  popup.style.right = "auto";
  popup.style.bottom = "auto";
  popup.style.transform = "none";
  popup.style.margin = "0";

  const layoutMaxWidth = teachPopupMaxWidthForLayout();
  if (layoutMaxWidth) {
    popup.style.maxWidth = layoutMaxWidth;
  } else {
    popup.style.maxWidth = "";
  }

  const width = popup.offsetWidth;
  let left: number;
  if (popup.classList.contains("cmd-teach-popup--align-end")) {
    left = btnRect.right - width;
  } else {
    left = btnRect.left;
  }
  left = Math.max(shell.left + margin, Math.min(left, shell.right - width - margin));

  popup.style.left = `${left}px`;
  popup.style.top = `${btnRect.bottom + gap}px`;

  void popup.offsetHeight;
  const popupRect = popup.getBoundingClientRect();
  const arrowTipY = popupRect.top - arrow;
  const nudge = btnRect.bottom - arrowTipY;
  if (Math.abs(nudge) > 0.5) {
    popup.style.top = `${popupRect.top + nudge}px`;
  }

  const viewportMargin = 8;
  const viewportTop = viewportMargin;
  const viewportBottom = window.innerHeight - popup.offsetHeight - viewportMargin;
  const currentTop = parseFloat(popup.style.top || "0");
  popup.style.top = `${Math.min(Math.max(currentTop, viewportTop), viewportBottom)}px`;

  const placed = popup.getBoundingClientRect();
  const btnCenterX = btnRect.left + btnRect.width / 2;
  if (popup.classList.contains("cmd-teach-popup--align-end")) {
    popup.style.setProperty(
      "--teach-arrow-offset-end",
      `${Math.max(0, placed.right - btnCenterX)}px`
    );
    popup.style.removeProperty("--teach-arrow-offset");
  } else {
    popup.style.setProperty(
      "--teach-arrow-offset",
      `${Math.max(0, btnCenterX - placed.left)}px`
    );
    popup.style.removeProperty("--teach-arrow-offset-end");
  }
}

export function syncCmdTeachPopup(
  popup: HTMLElement,
  btn: HTMLElement,
  popupId: CombatTeachPopupId,
  show: boolean
): void {
  if (!show) {
    gameState.temporarilyClosedTeachPopups.delete(popupId);
  }
  const visible = show && !gameState.temporarilyClosedTeachPopups.has(popupId);
  popup.classList.toggle("hidden", !visible);
  if (visible) {
    btn.setAttribute("aria-describedby", popupId);
    if (popup.classList.contains("cmd-teach-popup--dock-footer")) {
      requestAnimationFrame(() => {
        positionFooterTeachPopup(popup, btn);
        requestAnimationFrame(() => positionFooterTeachPopup(popup, btn));
      });
    }
  } else {
    btn.removeAttribute("aria-describedby");
    if (popup.classList.contains("cmd-teach-popup--dock-footer")) {
      clearFooterTeachPopupPosition(popup);
    }
  }
}

export function syncVisibleFooterTeachPopups(): void {
  if (!el.danceTeachPopup.classList.contains("hidden")) {
    positionFooterTeachPopup(el.danceTeachPopup, el.danceBtn);
  }
  if (!el.runTeachPopup.classList.contains("hidden")) {
    positionFooterTeachPopup(el.runTeachPopup, el.runBtn);
  }
}

export function bindFooterTeachPopupResize(): void {
  if (gameState.footerTeachPopupResizeBound) {
    return;
  }
  gameState.footerTeachPopupResizeBound = true;
  window.addEventListener("resize", syncVisibleFooterTeachPopups);
  el.gameShell.addEventListener("scroll", syncVisibleFooterTeachPopups);
}

export function syncCombatTeachPopups(
  showHeal: boolean,
  showDance: boolean,
  showRun: boolean
): void {
  const hasFoe = gameState.foe !== null;
  syncCmdTeachPopup(
    el.healTeachPopup,
    el.healBtn,
    "cmd-heal-teach",
    shouldShowHealTeachCopy(gameState.combatHints, showHeal, gameState.phase, hasFoe)
  );
  syncCmdTeachPopup(
    el.danceTeachPopup,
    el.danceBtn,
    "cmd-dance-teach",
    shouldShowDanceTeachCopy(gameState.combatHints, showDance, gameState.phase, hasFoe)
  );
  syncCmdTeachPopup(
    el.runTeachPopup,
    el.runBtn,
    "cmd-run-teach",
    shouldShowRunTeachCopy(gameState.combatHints, showRun, gameState.phase, hasFoe)
  );
}

const COMBAT_TEACH_POPUPS: readonly {
  id: CombatTeachPopupId;
  popup: HTMLElement;
}[] = [
  { id: "cmd-heal-teach", popup: el.healTeachPopup },
  { id: "cmd-dance-teach", popup: el.danceTeachPopup },
  { id: "cmd-run-teach", popup: el.runTeachPopup },
];

export function visibleCombatTeachPopups(): typeof COMBAT_TEACH_POPUPS {
  return COMBAT_TEACH_POPUPS.filter(({ popup }) => !popup.classList.contains("hidden"));
}

export function closeVisibleCombatTeachPopups(): void {
  const visiblePopups = visibleCombatTeachPopups();
  if (visiblePopups.length === 0) {
    return;
  }
  for (const { id } of visiblePopups) {
    gameState.temporarilyClosedTeachPopups.add(id);
  }
  syncCombatHintClasses();
}

export function isCombatCommandClick(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest("#actions [data-action]") !== null;
}

export function bindCombatTeachPopupDismissal(): void {
  document.addEventListener("click", (event) => {
    const visiblePopups = visibleCombatTeachPopups();
    if (visiblePopups.length === 0) {
      return;
    }
    const target = event.target;
    if (target instanceof Node && visiblePopups.some(({ popup }) => popup.contains(target))) {
      return;
    }
    if (isCombatCommandClick(target)) {
      return;
    }
    closeVisibleCombatTeachPopups();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || visibleCombatTeachPopups().length === 0) {
      return;
    }
    event.preventDefault();
    closeVisibleCombatTeachPopups();
  });
}

export function syncCombatHintClasses(): void {
  if (!el.healBtn || !el.danceBtn || !el.attackBtn || !el.runBtn) {
    return;
  }
  const hasFoe = gameState.foe !== null;
  const showAttack = shouldShowAttackHint(gameState.combatHints, gameState.phase, hasFoe);
  const showHeal = shouldShowHealHint(
    gameState.combatHints,
    gameState.player.hp,
    gameState.player.maxHp,
    gameState.phase,
    hasFoe,
    gameState.foe?.attack ?? 0,
    gameState.foeHypeLevel
  );
  const showRun =
    gameState.foe !== null &&
    shouldShowRunHint(
      gameState.combatHints,
      gameState.player.hp,
      gameState.foe.attack,
      gameState.foeHypeLevel,
      gameState.phase,
      hasFoe
    );
  const showDance = shouldShowDanceHint(
    gameState.combatHints,
    gameState.player.hp,
    gameState.player.maxHp,
    gameState.phase,
    hasFoe,
    gameState.hypeLevel,
    gameState.foe?.attack ?? 0,
    gameState.foeHypeLevel
  );
  el.attackBtn.classList.toggle("cmd-hint-flash", showAttack);
  el.healBtn.classList.toggle("cmd-hint-flash", showHeal);
  el.danceBtn.classList.toggle("cmd-hint-flash", showDance);
  el.runBtn.classList.toggle("cmd-hint-flash", showRun);
  el.attackBtn.dataset.combatHint = showAttack ? "on" : "off";
  el.healBtn.dataset.combatHint = showHeal ? "on" : "off";
  el.danceBtn.dataset.combatHint = showDance ? "on" : "off";
  el.runBtn.dataset.combatHint = showRun ? "on" : "off";
  syncCombatTeachPopups(showHeal, showDance, showRun);
}
