/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  appendDanceHypeSuffix,
  clearLog,
  danceHypeSuffix,
  formatFoeInText,
  logEndTitle,
  rememberBattleLogEntry,
  resetBattleLogHistory,
} from "../../src/game/battle-log.js";
import { gameState } from "../../src/game/state.js";

describe("battle-log — dance hype suffix helpers", () => {
  it("formats gain, cap, and empty suffixes", () => {
    expect(danceHypeSuffix(2, false)).toBe("+2 HYPE");
    expect(danceHypeSuffix(0, true)).toBe("MAX HYPE");
    expect(danceHypeSuffix(0, false)).toBe("");
  });

  it("appends suffix only when non-empty", () => {
    expect(appendDanceHypeSuffix("You groove.", "+1 HYPE")).toBe("You groove. +1 HYPE");
    expect(appendDanceHypeSuffix("You groove.", "")).toBe("You groove.");
  });
});

describe("battle-log — formatFoeInText", () => {
  it("substitutes the current foe name", () => {
    gameState.foe = {
      id: "test-foe",
      name: "Rotten Roach",
      emoji: "🐜",
      hp: 10,
      maxHp: 10,
      attack: 3,
      level: 1,
    };
    expect(formatFoeInText("{foe} boos loudly.")).toBe("Rotten Roach boos loudly.");
    expect(formatFoeInText("{foe} and {foe}")).toBe("Rotten Roach and Rotten Roach");
  });

  it("falls back when no foe is active", () => {
    gameState.foe = null;
    expect(formatFoeInText("{foe} waits.")).toBe("foe waits.");
  });
});

describe("battle-log — history entries", () => {
  beforeEach(() => {
    resetBattleLogHistory();
    gameState.wave = 3;
    gameState.waveAttempt = 2;
    gameState.turn = 4;
    gameState.hypeLevel = 2;
    gameState.foeHypeLevel = 1;
    gameState.foeColorTheme = "amber";
    gameState.foe = {
      id: "ghoulish-gob",
      name: "Ghoulish Gob",
      emoji: "👺",
      hp: 8,
      maxHp: 10,
      attack: 4,
      level: 1,
    };
  });

  it("stores wave title metadata for wave headers", () => {
    logEndTitle("WAVE 3");
    expect(gameState.battleLogHistory).toHaveLength(1);
    expect(gameState.battleLogHistory[0]).toMatchObject({
      title: "WAVE 3",
      waveTitle: { wave: 3, attempt: 2 },
      wave: 3,
      foeColorTheme: "amber",
    });
  });

  it("captures combat stats on action entries", () => {
    rememberBattleLogEntry(
      [
        { text: "You hit!", kind: "player" },
        { text: "Ouch!", kind: "foe" },
      ],
      "Attack",
      undefined,
      5
    );
    const entry = gameState.battleLogHistory[0]!;
    expect(entry.turn).toBe(5);
    expect(entry.action).toBe("Attack");
    expect(entry.playerPower).toBe(2);
    expect(entry.foePower).toBe(1);
    expect(entry.lines).toHaveLength(2);
  });
});

describe("battle-log — clearLog", () => {
  beforeEach(() => {
    resetBattleLogHistory();
    rememberBattleLogEntry([{ text: "old", kind: "info" }]);
  });

  it("resets history and battle text placeholder", () => {
    clearLog();
    expect(gameState.battleLogHistory).toHaveLength(0);
    expect(document.getElementById("battle-text")?.textContent).toBe("What will you do?");
    expect(document.getElementById("battle-text")?.className).toBe("battle-text battle-info");
  });
});
