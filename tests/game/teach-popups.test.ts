/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it } from "vitest";
import { createCombatHintsState } from "../../src/lib/combat-hints.js";
import { el } from "../../src/game/dom.js";
import { gameState } from "../../src/game/state.js";
import { isCombatCommandClick, syncCombatHintClasses } from "../../src/game/teach-popups.js";

function resetHintButtons(): void {
  for (const btn of [el.attackBtn, el.healBtn, el.danceBtn, el.runBtn]) {
    btn.classList.remove("cmd-hint-flash");
    btn.dataset.combatHint = "off";
  }
  el.healTeachPopup.classList.add("hidden");
  el.danceTeachPopup.classList.add("hidden");
  el.runTeachPopup.classList.add("hidden");
}

describe("teach-popups — syncCombatHintClasses", () => {
  beforeEach(() => {
    resetHintButtons();
    gameState.phase = "combat";
    gameState.combatHints = createCombatHintsState();
    gameState.temporarilyClosedTeachPopups.clear();
    gameState.foe = {
      id: "ghoulish-gob",
      name: "Ghoulish Gob",
      emoji: "👺",
      hp: 10,
      maxHp: 10,
      attack: 4,
      level: 1,
    };
    gameState.player.hp = 20;
    gameState.player.maxHp = 20;
    gameState.hypeLevel = 0;
    gameState.foeHypeLevel = 0;
  });

  it("highlights attack before the first strike", () => {
    syncCombatHintClasses();
    expect(el.attackBtn.classList.contains("cmd-hint-flash")).toBe(true);
    expect(el.attackBtn.dataset.combatHint).toBe("on");
    expect(el.healBtn.classList.contains("cmd-hint-flash")).toBe(false);
  });

  it("highlights heal at low hp after attack hint is spent", () => {
    gameState.combatHints = createCombatHintsState({ dismissedAttackHint: true });
    gameState.player.hp = 8;
    syncCombatHintClasses();
    expect(el.healBtn.classList.contains("cmd-hint-flash")).toBe(true);
    expect(el.healBtn.dataset.combatHint).toBe("on");
    expect(el.attackBtn.classList.contains("cmd-hint-flash")).toBe(false);
  });

  it("clears hints outside combat", () => {
    gameState.phase = "setup";
    syncCombatHintClasses();
    expect(el.attackBtn.classList.contains("cmd-hint-flash")).toBe(false);
    expect(el.healBtn.classList.contains("cmd-hint-flash")).toBe(false);
    expect(el.danceBtn.classList.contains("cmd-hint-flash")).toBe(false);
    expect(el.runBtn.classList.contains("cmd-hint-flash")).toBe(false);
  });
});

describe("teach-popups — isCombatCommandClick", () => {
  it("detects clicks on combat action buttons", () => {
    const btn = document.createElement("button");
    btn.dataset.action = "attack";
    el.actions.appendChild(btn);
    expect(isCombatCommandClick(btn)).toBe(true);
    btn.remove();
  });

  it("ignores clicks outside the action bar", () => {
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    expect(isCombatCommandClick(outside)).toBe(false);
    outside.remove();
  });
});
