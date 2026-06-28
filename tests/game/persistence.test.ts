/**
 * @vitest-environment happy-dom
 */
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { STORAGE_KEY } from "../../src/game/storage-keys.js";
import {
  normalizeSnapshot,
  readPersistedFields,
  sanitizeBattleLogHistory,
  withSaveMeta,
} from "../../src/game/persistence.js";
import { gameState } from "../../src/game/state.js";
import type { GameSnapshot } from "../../src/game/types.js";

describe("persistence — normalizeSnapshot", () => {
  it("normalizes foe and hype fields from snapshot data", () => {
    const snap = normalizeSnapshot({
      wave: 2,
      turn: 3,
      player: { name: "Test", hp: 15, maxHp: 20, attack: 5, emoji: "🐱" },
      foe: {
        id: "ghoulish-gob",
        name: "Ghoulish Gob",
        emoji: "👺",
        hp: 8,
        maxHp: 10,
        attack: 4,
        level: 1,
      },
      foeHypeLevel: 2,
      hypeLevel: 1,
    } as GameSnapshot);

    expect(snap.foe?.id).toBe("ghoulish-gob");
    expect(snap.foeHypeLevel).toBe(2);
    expect(snap.hypeLevel).toBe(1);
    expect(snap.wave).toBe(2);
    expect(snap.player.name).toBe("Test");
  });

  it("drops invalid heroColorTheme and keeps valid foe queue ids", () => {
    const snap = normalizeSnapshot({
      wave: 1,
      turn: 1,
      player: { name: "A", hp: 20, maxHp: 20, attack: 5, emoji: "🐱" },
      heroColorTheme: "neon-hacker-purple",
      foeOrderIds: ["ghoulish-gob", "totally-fake"],
      foeQueueIds: ["ghoulish-gob", "bogus-id"],
      deferredFoeIds: ["ghoulish-gob", "nope"],
    });

    expect(snap.heroColorTheme).toBeUndefined();
    expect(snap.foeOrderIds).toEqual(["ghoulish-gob"]);
    expect(snap.foeQueueIds).toEqual(["ghoulish-gob"]);
    expect(snap.deferredFoeIds).toEqual(["ghoulish-gob"]);
  });

  it("sanitizes malformed battle log history on snapshot restore", () => {
    gameState.wave = 4;
    const snap = normalizeSnapshot({
      wave: 1,
      turn: 1,
      player: { name: "A", hp: 20, maxHp: 20, attack: 5, emoji: "🐱" },
      battleLogHistory: [
        {
          title: "WAVE 1",
          lines: [{ text: "ok", kind: "player" }, { text: "bad", kind: "hack" }],
        },
        null,
      ],
    });

    expect(snap.battleLogHistory?.[0]?.lines).toEqual([{ text: "ok", kind: "player" }]);
  });
});

describe("persistence — withSaveMeta and readPersistedFields", () => {
  beforeEach(() => {
    localStorage.clear();
    gameState.currentColorMode = "dark";
  });

  it("writes colorMode from gameState into save meta", () => {
    gameState.currentColorMode = "light";
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ bestWave: 3, runsPlayed: 2, colorMode: "dark" })
    );

    const meta = withSaveMeta({ playerEmoji: "🐱" });
    expect(meta.colorMode).toBe("light");
    expect(meta.bestWave).toBe(3);
    expect(meta.playerEmoji).toBe("🐱");
  });

  it("preserves normalized audio preferences in every save write", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        bestWave: 3,
        runsPlayed: 2,
        colorMode: "dark",
        musicLevel: "low",
        sfxLevel: "off",
      })
    );

    expect(withSaveMeta({ bestWave: 0, runsPlayed: 0 })).toMatchObject({
      bestWave: 0,
      runsPlayed: 0,
      musicLevel: "low",
      sfxLevel: "off",
    });
  });

  it("round-trips pendingConfirm through readPersistedFields", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        bestWave: 1,
        runsPlayed: 1,
        colorMode: "dark",
        pendingConfirm: "newRun",
        snapshot: { wave: 1 },
      })
    );

    const fields = readPersistedFields();
    expect(fields.pendingConfirm).toBe("newRun");
    expect(fields.snapshot).toEqual({ wave: 1 });

    const merged = withSaveMeta(fields);
    expect(merged.pendingConfirm).toBe("newRun");
    expect(merged.colorMode).toBe("dark");
  });
});

describe("persistence — sanitizeBattleLogHistory", () => {
  beforeEach(() => {
    gameState.wave = 7;
  });

  it("keeps only the last 200 entries", () => {
    const raw = Array.from({ length: 205 }, (_, i) => ({
      title: `Entry ${i}`,
      lines: [{ text: `line ${i}`, kind: "info" }],
    }));

    const entries = sanitizeBattleLogHistory(raw);
    expect(entries).toHaveLength(200);
    expect(entries?.[0]?.title).toBe("Entry 5");
    expect(entries?.[199]?.title).toBe("Entry 204");
  });

  it("truncates long line text and drops invalid line kinds", () => {
    const entries = sanitizeBattleLogHistory([
      {
        lines: [{ text: "x".repeat(300), kind: "player" }, { text: "nope", kind: "evil" }],
      },
    ]);

    expect(entries?.[0]?.lines[0]?.text).toHaveLength(240);
    expect(entries?.[0]?.lines).toHaveLength(1);
  });

  it("returns undefined for empty or invalid input", () => {
    expect(sanitizeBattleLogHistory([])).toBeUndefined();
    expect(sanitizeBattleLogHistory(null)).toBeUndefined();
    expect(sanitizeBattleLogHistory("nope")).toBeUndefined();
  });

  it("keeps entries with empty line arrays as metadata-only records", () => {
    const entries = sanitizeBattleLogHistory([{ lines: [] }]);
    expect(entries).toHaveLength(1);
    expect(entries?.[0]?.lines).toEqual([]);
    expect(entries?.[0]?.wave).toBe(7);
  });
});

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("persistence — project paths", () => {
  it("uses the expected storage key constant", () => {
    expect(STORAGE_KEY).toBe("critterwave-v1.1");
    expect(projectRoot).toContain("critterwave");
  });
});
