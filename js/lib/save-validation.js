import { parseColorMode } from "./color-mode.js";
import { resolveMusicLevelFromSave, resolveSfxLevelFromSave, } from "./sound-volume-preset.js";
import { isColorThemeId } from "./color-themes.js";
import { CAMPAIGN_WAVE_COUNT, clampHype, HERO_NAME_MAX_LENGTH, makeFoeFromTemplate, normalizeHeroName, playerStatsForWave, } from "./game-logic.js";
const GAME_PHASES = new Set(["combat", "gameover", "victory"]);
export function clampInt(value, min, max, fallback) {
    const n = typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : fallback;
    return Math.min(max, Math.max(min, n));
}
export function parseSaveRecord(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return null;
    }
    return raw;
}
export function parsePendingConfirm(value) {
    return value === "newRun" || value === "clearData" ? value : undefined;
}
export function parseSaveMeta(raw, options) {
    const campaignWaves = options.campaignWaves ?? CAMPAIGN_WAVE_COUNT;
    const p = parseSaveRecord(raw);
    if (!p) {
        return {
            bestWave: 0,
            runsPlayed: 0,
            colorMode: "dark",
            soundMuted: false,
            musicLevel: "high",
            sfxLevel: "high",
            musicMuted: false,
            sfxMuted: false,
            setupActive: false,
        };
    }
    const playerEmoji = typeof p.playerEmoji === "string" && options.allowedHeroEmojis.has(p.playerEmoji)
        ? p.playerEmoji
        : undefined;
    const heroColorTheme = typeof p.heroColorTheme === "string" && isColorThemeId(p.heroColorTheme)
        ? p.heroColorTheme
        : undefined;
    const heroName = typeof p.heroName === "string"
        ? normalizeHeroName(p.heroName) || undefined
        : undefined;
    const heroLabel = typeof p.heroLabel === "string"
        ? normalizeHeroName(p.heroLabel) || undefined
        : undefined;
    const legacyMuted = p.soundMuted === true;
    const musicLevel = resolveMusicLevelFromSave({
        musicLevel: p.musicLevel,
        musicMuted: p.musicMuted === true,
        soundMuted: legacyMuted,
        soundVolumePreset: p.soundVolumePreset,
    });
    const sfxLevel = resolveSfxLevelFromSave({
        sfxLevel: p.sfxLevel,
        sfxMuted: p.sfxMuted === true,
        soundMuted: legacyMuted,
        soundVolumePreset: p.soundVolumePreset,
    });
    return {
        bestWave: clampInt(p.bestWave, 0, campaignWaves, 0),
        runsPlayed: clampInt(p.runsPlayed, 0, 999999, 0),
        colorMode: parseColorMode(p.colorMode),
        soundMuted: legacyMuted,
        musicLevel,
        sfxLevel,
        musicMuted: musicLevel === "off",
        sfxMuted: sfxLevel === "off",
        playerEmoji,
        heroName,
        heroLabel,
        heroColorTheme,
        setupActive: p.setupActive === true,
        pendingConfirm: parsePendingConfirm(p.pendingConfirm),
    };
}
export function sanitizeSavedHeroName(heroName, heroLabel, fallbackLabel) {
    const raw = heroName ?? heroLabel ?? fallbackLabel;
    const normalized = normalizeHeroName(raw);
    if (normalized) {
        return normalized;
    }
    const fallback = normalizeHeroName(fallbackLabel);
    return fallback || fallbackLabel.slice(0, HERO_NAME_MAX_LENGTH);
}
export function sanitizeSnapshotPlayer(raw, wave, allowedHeroEmojis, defaultEmoji, fallbackName) {
    const p = parseSaveRecord(raw) ?? {};
    const stats = playerStatsForWave(wave);
    const emoji = typeof p.emoji === "string" && allowedHeroEmojis.has(p.emoji)
        ? p.emoji
        : defaultEmoji;
    const maxHp = stats.maxHp;
    const hp = clampInt(p.hp, 0, maxHp, maxHp);
    const rawName = typeof p.name === "string" ? p.name : fallbackName;
    const name = sanitizeSavedHeroName(rawName, undefined, fallbackName);
    return { name, hp, maxHp, attack: stats.attack, emoji };
}
export function sanitizeSnapshotFoe(raw, wave, foesById) {
    const p = parseSaveRecord(raw);
    if (!p) {
        return null;
    }
    const id = typeof p.id === "string" ? p.id : "";
    const template = foesById.get(id);
    if (!template) {
        return null;
    }
    const canonical = makeFoeFromTemplate(template, wave);
    const maxHp = clampInt(p.maxHp, 1, 999, canonical.maxHp);
    const hp = clampInt(p.hp, 0, maxHp, Math.min(canonical.hp, maxHp));
    return {
        id: canonical.id,
        name: canonical.name,
        emoji: canonical.emoji,
        hp,
        maxHp,
        attack: canonical.attack,
        level: canonical.level,
    };
}
export function sanitizeGamePhase(value) {
    return typeof value === "string" && GAME_PHASES.has(value)
        ? value
        : "combat";
}
export function sanitizeWave(value, campaignWaves = CAMPAIGN_WAVE_COUNT) {
    return clampInt(value, 1, campaignWaves, 1);
}
export function sanitizeTurn(value) {
    return clampInt(value, 1, 99999, 1);
}
export function sanitizeHypeLevel(value) {
    return clampHype(typeof value === "number" && Number.isFinite(value) ? value : 0);
}
export function sanitizeIdList(value, validIds) {
    if (!Array.isArray(value)) {
        return undefined;
    }
    const ids = value.filter((id) => typeof id === "string" && validIds.has(id));
    return ids.length > 0 ? ids : undefined;
}
export function isDebugHost(hostname) {
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}
