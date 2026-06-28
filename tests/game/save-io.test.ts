/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  LEGACY_STORAGE_KEYS,
  STORAGE_KEY,
} from "../../src/game/storage-keys.js";
import {
  getStorageRaw,
  loadSave,
  migrateLegacyStorageKey,
} from "../../src/game/save-io.js";

describe("save-io — storage key migration", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("uses critterwave-v1.1 as the current storage key", () => {
    expect(STORAGE_KEY).toBe("critterwave-v1.1");
    expect(LEGACY_STORAGE_KEYS).toEqual([
      "critterwave-v1.0",
      "critterwave-v0.7",
      "critterwave-v6",
    ]);
  });

  it("migrates legacy v1.0 save data to v1.1 and removes the old key", () => {
    const legacyKey = LEGACY_STORAGE_KEYS[0]!;
    const payload = JSON.stringify({
      bestWave: 12,
      runsPlayed: 3,
      colorMode: "light",
      heroName: "Pat",
    });
    localStorage.setItem(legacyKey, payload);

    migrateLegacyStorageKey();

    expect(localStorage.getItem(STORAGE_KEY)).toBe(payload);
    expect(localStorage.getItem(legacyKey)).toBeNull();
  });

  it("migrates legacy v6 save data to v1.1 and removes the old key", () => {
    const legacyKey = LEGACY_STORAGE_KEYS[2]!;
    const payload = JSON.stringify({
      bestWave: 21,
      runsPlayed: 5,
      colorMode: "dark",
      heroName: "Sam",
    });
    localStorage.setItem(legacyKey, payload);

    migrateLegacyStorageKey();

    expect(localStorage.getItem(STORAGE_KEY)).toBe(payload);
    expect(localStorage.getItem(legacyKey)).toBeNull();
  });

  it("does not overwrite an existing v1.1 save when legacy data is present", () => {
    const legacyKey = LEGACY_STORAGE_KEYS[0]!;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ bestWave: 99, runsPlayed: 1, colorMode: "dark" })
    );
    localStorage.setItem(
      legacyKey,
      JSON.stringify({ bestWave: 1, runsPlayed: 0, colorMode: "light" })
    );

    migrateLegacyStorageKey();

    expect(loadSave("dark").bestWave).toBe(99);
    expect(localStorage.getItem(legacyKey)).not.toBeNull();
  });

  it("migrates on first read through getStorageRaw", () => {
    const legacyKey = LEGACY_STORAGE_KEYS[1]!;
    localStorage.setItem(
      legacyKey,
      JSON.stringify({ bestWave: 4, runsPlayed: 2, colorMode: "dark" })
    );

    expect(getStorageRaw()).toContain('"bestWave":4');
    expect(localStorage.getItem(legacyKey)).toBeNull();
    expect(loadSave("dark").bestWave).toBe(4);
  });
});
