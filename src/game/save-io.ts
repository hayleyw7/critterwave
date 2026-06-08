import type { ColorMode } from "../lib/color-mode.js";
import { parsePendingConfirm, parseSaveMeta } from "../lib/save-validation.js";
import { CAMPAIGN_WAVES, STORAGE_KEY } from "./constants.js";
import { HERO_EMOJIS } from "./data.js";
import type { SaveData } from "./types.js";

export function getStorageRaw(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function writeSaveJson(data: Record<string, unknown>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function readPersistedFields(): Record<string, unknown> {
  try {
    const raw = getStorageRaw();
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const fields: Record<string, unknown> = {};
    if (typeof parsed.playerEmoji === "string") {
      fields.playerEmoji = parsed.playerEmoji;
    }
    if (typeof parsed.heroName === "string") {
      fields.heroName = parsed.heroName;
    }
    if (typeof parsed.heroColorTheme === "string") {
      fields.heroColorTheme = parsed.heroColorTheme;
    }
    if (parsed.setupActive === true) {
      fields.setupActive = true;
    }
    if (parsed.snapshot && typeof parsed.snapshot === "object") {
      fields.snapshot = parsed.snapshot;
    }
    const pendingConfirm = parsePendingConfirm(parsed.pendingConfirm);
    if (pendingConfirm) {
      fields.pendingConfirm = pendingConfirm;
    }
    return fields;
  } catch {
    return {};
  }
}

export function loadSave(fallbackColorMode: ColorMode): SaveData {
  try {
    const raw = getStorageRaw();
    if (!raw) {
      return { bestWave: 0, runsPlayed: 0, colorMode: fallbackColorMode };
    }
    return parseSaveMeta(JSON.parse(raw) as unknown, {
      allowedHeroEmojis: HERO_EMOJIS,
      campaignWaves: CAMPAIGN_WAVES,
    });
  } catch {
    return { bestWave: 0, runsPlayed: 0, colorMode: fallbackColorMode };
  }
}

export function withSaveMeta(
  fields: Record<string, unknown> = {},
  colorMode: ColorMode
): Record<string, unknown> {
  const save = loadSave(colorMode);
  return {
    bestWave: save.bestWave,
    runsPlayed: save.runsPlayed,
    colorMode,
    ...fields,
  };
}
