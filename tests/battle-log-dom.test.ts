/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from "vitest";
import {
  appendBattleHypeTail,
  appendBattleLine,
  setBattleLines,
} from "../src/lib/battle-log-dom.js";

describe("battle-log-dom", () => {
  it("renders battle lines with textContent (not HTML)", () => {
    const container = document.createElement("div");
    setBattleLines(container, [
      { text: "You hit for 3.", kind: "player" },
      { text: "Foe hits for 2.", kind: "foe" },
    ]);

    expect(container.className).toBe("battle-text");
    expect(container.children).toHaveLength(2);
    expect(container.querySelector(".battle-line.battle-player")?.textContent).toBe(
      "You hit for 3."
    );
    expect(container.querySelector(".battle-line.battle-foe")?.textContent).toBe(
      "Foe hits for 2."
    );
    expect(container.querySelector("script")).toBeNull();
  });

  it("does not interpret HTML in line text", () => {
    const container = document.createElement("div");
    appendBattleLine(container, '<img src=x onerror=alert(1)>', "foe");

    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toBe('<img src=x onerror=alert(1)>');
  });

  it("replaces prior lines when setBattleLines is called again", () => {
    const container = document.createElement("div");
    setBattleLines(container, [{ text: "First", kind: "info" }]);
    setBattleLines(container, [{ text: "Second", kind: "win" }]);

    expect(container.children).toHaveLength(1);
    expect(container.textContent).toBe("Second");
    expect(container.querySelector(".battle-win")).not.toBeNull();
  });

  it("skips empty hype tail", () => {
    const container = document.createElement("div");
    setBattleLines(container, [{ text: "You dance.", kind: "player" }]);
    appendBattleHypeTail(container, "");

    expect(container.children).toHaveLength(1);
  });

  it("appends trusted hype tail markup in its own line", () => {
    const container = document.createElement("div");
    appendBattleHypeTail(
      container,
      'You get <span class="battle-hype-gain">+1 HYPE</span>!'
    );

    const hypeLine = container.querySelector(".battle-hype-line");
    expect(hypeLine).not.toBeNull();
    expect(hypeLine?.querySelector(".battle-hype-gain")?.textContent).toBe("+1 HYPE");
  });
});
