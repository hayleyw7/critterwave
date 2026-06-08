import { describe, expect, it } from "vitest";
import { readCssModule } from "./bundle.js";

describe("css/game-over.css", () => {
  const gameOver = readCssModule("game-over.css");

  it("styles victory differently from defeat", () => {
    expect(gameOver).toContain(".game-over.game-victory");
    expect(gameOver).toContain(".game-over.game-victory .game-over-panel");
    expect(gameOver).toContain(".game-over.game-victory .victory-trophy");
  });
});
