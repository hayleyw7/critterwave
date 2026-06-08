import { describe, expect, it } from "vitest";
import {
  clampInt,
  isDebugHost,
  parsePendingConfirm,
  parseSaveMeta,
  parseSaveRecord,
  sanitizeGamePhase,
  sanitizeHypeLevel,
  sanitizeIdList,
  sanitizeSavedHeroName,
  sanitizeSnapshotFoe,
  sanitizeSnapshotPlayer,
  sanitizeTurn,
  sanitizeWave,
} from "../../src/lib/save-validation.js";
import { FOES } from "../../src/data/foes-data.js";
import { COLOR_THEME_IDS } from "../../src/lib/color-themes.js";

const HERO_EMOJIS = new Set(FOES.slice(0, 8).map((foe) => foe.emoji));
const FOES_BY_ID = new Map(FOES.map((foe) => [foe.id, foe]));
const FOE_IDS = new Set(FOES.map((foe) => foe.id));
const firstFoe = FOES[0]!;
const validTheme = COLOR_THEME_IDS[0]!;

describe("parseSaveRecord", () => {
  it("returns null for non-objects", () => {
    expect(parseSaveRecord(null)).toBeNull();
    expect(parseSaveRecord(undefined)).toBeNull();
    expect(parseSaveRecord("save")).toBeNull();
    expect(parseSaveRecord([])).toBeNull();
  });

  it("returns records for plain objects", () => {
    expect(parseSaveRecord({ wave: 1 })).toEqual({ wave: 1 });
  });
});

describe("clampInt", () => {
  it("clamps finite numbers and truncates", () => {
    expect(clampInt(3.9, 1, 5, 0)).toBe(3);
    expect(clampInt(99, 1, 5, 0)).toBe(5);
    expect(clampInt(-1, 0, 10, 4)).toBe(0);
  });

  it("uses fallback for non-numbers", () => {
    expect(clampInt("5", 0, 10, 2)).toBe(2);
    expect(clampInt(NaN, 0, 10, 2)).toBe(2);
    expect(clampInt(Infinity, 0, 10, 2)).toBe(2);
  });
});

describe("parseSaveMeta", () => {
  it("returns defaults for invalid raw save", () => {
    expect(parseSaveMeta(null, { allowedHeroEmojis: HERO_EMOJIS })).toEqual({
      bestWave: 0,
      runsPlayed: 0,
      colorMode: "dark",
      setupActive: false,
    });
  });

  it("clamps stats and drops invalid emoji", () => {
    const meta = parseSaveMeta(
      {
        bestWave: 999,
        runsPlayed: -3,
        playerEmoji: "not-an-emoji",
        heroName: "  Pat  ",
        setupActive: "yes",
      },
      { allowedHeroEmojis: HERO_EMOJIS, campaignWaves: 100 }
    );
    expect(meta.bestWave).toBe(100);
    expect(meta.runsPlayed).toBe(0);
    expect(meta.playerEmoji).toBeUndefined();
    expect(meta.heroName).toBe("Pat");
    expect(meta.setupActive).toBe(false);
  });

  it("keeps valid emoji, color theme, and labels", () => {
    const emoji = [...HERO_EMOJIS][0]!;
    const meta = parseSaveMeta(
      {
        bestWave: 12,
        runsPlayed: 4,
        playerEmoji: emoji,
        heroName: "Hero One",
        heroLabel: "Legacy Label",
        heroColorTheme: validTheme,
        setupActive: true,
      },
      { allowedHeroEmojis: HERO_EMOJIS, campaignWaves: 100 }
    );
    expect(meta.playerEmoji).toBe(emoji);
    expect(meta.heroName).toBe("Hero One");
    expect(meta.heroLabel).toBe("Legacy Label");
    expect(meta.heroColorTheme).toBe(validTheme);
    expect(meta.setupActive).toBe(true);
  });

  it("drops invalid color themes", () => {
    const meta = parseSaveMeta(
      { heroColorTheme: "neon-hacker-purple" },
      { allowedHeroEmojis: HERO_EMOJIS }
    );
    expect(meta.heroColorTheme).toBeUndefined();
  });

  it("parses pending confirm dialog kind", () => {
    expect(parsePendingConfirm("newRun")).toBe("newRun");
    expect(parsePendingConfirm("clearData")).toBe("clearData");
    expect(parsePendingConfirm("delete")).toBeUndefined();
    expect(
      parseSaveMeta({ pendingConfirm: "clearData" }, { allowedHeroEmojis: HERO_EMOJIS })
        .pendingConfirm
    ).toBe("clearData");
  });

  it("normalizes blank hero names to undefined", () => {
    const meta = parseSaveMeta(
      { heroName: "   ", heroLabel: "<>" },
      { allowedHeroEmojis: HERO_EMOJIS }
    );
    expect(meta.heroName).toBeUndefined();
    expect(meta.heroLabel).toBeUndefined();
  });

  it("parses color mode from save", () => {
    expect(
      parseSaveMeta({ colorMode: "light" }, { allowedHeroEmojis: HERO_EMOJIS }).colorMode
    ).toBe("light");
    expect(
      parseSaveMeta({ colorMode: "dark" }, { allowedHeroEmojis: HERO_EMOJIS }).colorMode
    ).toBe("dark");
    expect(
      parseSaveMeta({ colorMode: "neon" }, { allowedHeroEmojis: HERO_EMOJIS }).colorMode
    ).toBe("dark");
  });
});

describe("sanitizeSavedHeroName", () => {
  it("normalizes tampered save names", () => {
    expect(sanitizeSavedHeroName("<>", undefined, "Cat")).toBe("Cat");
    expect(sanitizeSavedHeroName("  Long   Name   Here  ", undefined, "Cat")).toBe(
      "Long Name Here"
    );
  });

  it("prefers heroName over heroLabel over fallback", () => {
    expect(sanitizeSavedHeroName("Pat", "Legacy", "Cat")).toBe("Pat");
    expect(sanitizeSavedHeroName(undefined, "Legacy", "Cat")).toBe("Legacy");
    expect(sanitizeSavedHeroName(undefined, undefined, "Cat")).toBe("Cat");
  });
});

describe("sanitizeSnapshotPlayer", () => {
  it("clamps hp and rejects unknown emoji", () => {
    const player = sanitizeSnapshotPlayer(
      { name: "Hero", hp: 999, emoji: "🦄" },
      1,
      HERO_EMOJIS,
      firstFoe.emoji,
      "Fallback"
    );
    expect(player.emoji).toBe(firstFoe.emoji);
    expect(player.hp).toBeLessThanOrEqual(player.maxHp);
    expect(player.name).toBe("Hero");
    expect(player.attack).toBeGreaterThan(0);
  });

  it("sanitizes malicious display names", () => {
    const player = sanitizeSnapshotPlayer(
      { name: "<script>alert(1)</script>", hp: 5 },
      1,
      HERO_EMOJIS,
      firstFoe.emoji,
      "Fallback"
    );
    expect(player.name).not.toContain("<");
    expect(player.name).not.toContain(">");
  });

  it("defaults missing hp to max for the wave", () => {
    const player = sanitizeSnapshotPlayer({}, 5, HERO_EMOJIS, firstFoe.emoji, "Cat");
    expect(player.hp).toBe(player.maxHp);
  });
});

describe("sanitizeSnapshotFoe", () => {
  it("rebuilds foe stats from template", () => {
    const foe = sanitizeSnapshotFoe(
      { id: firstFoe.id, hp: 999, maxHp: 999 },
      3,
      FOES_BY_ID
    );
    expect(foe?.id).toBe(firstFoe.id);
    expect(foe?.hp).toBeLessThanOrEqual(foe?.maxHp ?? 0);
    expect(foe?.name).toBe(firstFoe.name);
    expect(foe?.attack).toBeGreaterThan(0);
  });

  it("returns null for unknown foe id", () => {
    expect(sanitizeSnapshotFoe({ id: "missing-foe" }, 1, FOES_BY_ID)).toBeNull();
  });

  it("returns null for non-object foe payloads", () => {
    expect(sanitizeSnapshotFoe(null, 1, FOES_BY_ID)).toBeNull();
    expect(sanitizeSnapshotFoe("foe", 1, FOES_BY_ID)).toBeNull();
  });

  it("clamps saved hp below canonical max", () => {
    const foe = sanitizeSnapshotFoe(
      { id: firstFoe.id, hp: 1, maxHp: 2 },
      10,
      FOES_BY_ID
    );
    expect(foe?.hp).toBe(1);
    expect(foe?.maxHp).toBeGreaterThanOrEqual(foe?.hp ?? 0);
  });
});

describe("sanitizeGamePhase", () => {
  it("accepts valid phases", () => {
    expect(sanitizeGamePhase("combat")).toBe("combat");
    expect(sanitizeGamePhase("gameover")).toBe("gameover");
    expect(sanitizeGamePhase("victory")).toBe("victory");
  });

  it("falls back to combat for invalid phases", () => {
    expect(sanitizeGamePhase("hack")).toBe("combat");
    expect(sanitizeGamePhase(null)).toBe("combat");
  });
});

describe("sanitizeWave", () => {
  it("clamps wave to campaign bounds", () => {
    expect(sanitizeWave(0, 100)).toBe(1);
    expect(sanitizeWave(500, 100)).toBe(100);
    expect(sanitizeWave("2", 100)).toBe(1);
  });
});

describe("sanitizeTurn", () => {
  it("clamps turn to at least 1", () => {
    expect(sanitizeTurn(0)).toBe(1);
    expect(sanitizeTurn(-5)).toBe(1);
    expect(sanitizeTurn(42)).toBe(42);
  });
});

describe("sanitizeHypeLevel", () => {
  it("clamps hype to valid range", () => {
    expect(sanitizeHypeLevel(99)).toBe(5);
    expect(sanitizeHypeLevel(-2)).toBe(0);
    expect(sanitizeHypeLevel(3)).toBe(3);
  });

  it("treats non-numbers as zero hype", () => {
    expect(sanitizeHypeLevel("3")).toBe(0);
  });
});

describe("sanitizeIdList", () => {
  it("filters unknown ids and preserves order", () => {
    const ids = sanitizeIdList(
      [firstFoe.id, "missing", FOES[1]!.id],
      FOE_IDS
    );
    expect(ids).toEqual([firstFoe.id, FOES[1]!.id]);
  });

  it("returns undefined for empty or invalid lists", () => {
    expect(sanitizeIdList([], FOE_IDS)).toBeUndefined();
    expect(sanitizeIdList(["missing"], FOE_IDS)).toBeUndefined();
    expect(sanitizeIdList("not-array", FOE_IDS)).toBeUndefined();
  });
});

describe("isDebugHost", () => {
  it("allows localhost only", () => {
    expect(isDebugHost("localhost")).toBe(true);
    expect(isDebugHost("127.0.0.1")).toBe(true);
    expect(isDebugHost("[::1]")).toBe(true);
    expect(isDebugHost("example.com")).toBe(false);
    expect(isDebugHost("localhost.evil.com")).toBe(false);
  });
});
