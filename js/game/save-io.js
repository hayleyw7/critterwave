import { parsePendingConfirm, parseSaveMeta } from "../lib/save-validation.js";
import { parseSoundChannelLevel } from "../lib/sound-volume-preset.js";
import { CAMPAIGN_WAVES, LEGACY_STORAGE_KEYS, STORAGE_KEY } from "./constants.js";
import { HERO_EMOJIS } from "./data.js";
export function migrateLegacyStorageKey() {
    if (localStorage.getItem(STORAGE_KEY)) {
        return;
    }
    for (const legacyKey of LEGACY_STORAGE_KEYS) {
        const raw = localStorage.getItem(legacyKey);
        if (raw) {
            localStorage.setItem(STORAGE_KEY, raw);
            localStorage.removeItem(legacyKey);
            return;
        }
    }
}
export function getStorageRaw() {
    migrateLegacyStorageKey();
    return localStorage.getItem(STORAGE_KEY);
}
export function writeSaveJson(data) {
    migrateLegacyStorageKey();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
export function readPersistedFields() {
    try {
        const raw = getStorageRaw();
        if (!raw) {
            return {};
        }
        const parsed = JSON.parse(raw);
        const fields = {};
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
        if (parsed.soundMuted === true) {
            fields.soundMuted = true;
        }
        if (parsed.musicMuted === true) {
            fields.musicMuted = true;
        }
        if (parsed.sfxMuted === true) {
            fields.sfxMuted = true;
        }
        const musicLevel = parseSoundChannelLevel(parsed.musicLevel);
        if (musicLevel) {
            fields.musicLevel = musicLevel;
        }
        const sfxLevel = parseSoundChannelLevel(parsed.sfxLevel);
        if (sfxLevel) {
            fields.sfxLevel = sfxLevel;
        }
        if (parsed.snapshot && typeof parsed.snapshot === "object") {
            fields.snapshot = parsed.snapshot;
        }
        const pendingConfirm = parsePendingConfirm(parsed.pendingConfirm);
        if (pendingConfirm) {
            fields.pendingConfirm = pendingConfirm;
        }
        return fields;
    }
    catch {
        return {};
    }
}
export function loadSave(fallbackColorMode) {
    try {
        const raw = getStorageRaw();
        if (!raw) {
            return { bestWave: 0, runsPlayed: 0, colorMode: fallbackColorMode };
        }
        return parseSaveMeta(JSON.parse(raw), {
            allowedHeroEmojis: HERO_EMOJIS,
            campaignWaves: CAMPAIGN_WAVES,
        });
    }
    catch {
        return { bestWave: 0, runsPlayed: 0, colorMode: fallbackColorMode };
    }
}
export function withSaveMeta(fields = {}, colorMode) {
    const save = loadSave(colorMode);
    return {
        bestWave: save.bestWave,
        runsPlayed: save.runsPlayed,
        colorMode,
        musicLevel: save.musicLevel,
        sfxLevel: save.sfxLevel,
        ...fields,
    };
}
