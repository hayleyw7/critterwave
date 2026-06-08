/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_HERO_NAME } from "../../src/game/constants.js";
import { gameState } from "../../src/game/state.js";

describe("game constants — hero naming", () => {
  it("uses Hero as the default hero display name", () => {
    expect(DEFAULT_HERO_NAME).toBe("Hero");
    expect(DEFAULT_HERO_NAME.toLowerCase()).not.toBe("dingus");
  });

  it("initial game state matches DEFAULT_HERO_NAME", () => {
    expect(gameState.player.name).toBe(DEFAULT_HERO_NAME);
  });
});
