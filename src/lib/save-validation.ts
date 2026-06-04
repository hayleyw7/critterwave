import { parseColorMode, type ColorMode } from "./color-mode.js";
import { isColorThemeId, type ColorThemeId } from "./color-themes.js";
import {
  CAMPAIGN_WAVE_COUNT,
  clampHype,
  HERO_NAME_MAX_LENGTH,
  makeFoeFromTemplate,
  normalizeHeroName,
  playerStatsForWave,
  type FoeTemplate,
} from "./game-logic.js";

export type GamePhase = "combat" | "gameover" | "victory";

const GAME_PHASES = new Set<GamePhase>(["combat", "gameover", "victory"]);

export function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n =
    typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : fallback;
  return Math.min(max, Math.max(min, n));
}

export function parseSaveRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  return raw as Record<string, unknown>;
}

export type ParsedSaveMeta = {
  bestWave: number;
  runsPlayed: number;
  colorMode: ColorMode;
  playerEmoji?: string;
  heroName?: string;
  heroLabel?: string;
  heroColorTheme?: ColorThemeId;
  setupActive: boolean;
};

export function parseSaveMeta(
  raw: unknown,
  options: { allowedHeroEmojis: ReadonlySet<string>; campaignWaves?: number }
): ParsedSaveMeta {
  const campaignWaves = options.campaignWaves ?? CAMPAIGN_WAVE_COUNT;
  const p = parseSaveRecord(raw);
  if (!p) {
    return { bestWave: 0, runsPlayed: 0, colorMode: "dark", setupActive: false };
  }

  const playerEmoji =
    typeof p.playerEmoji === "string" && options.allowedHeroEmojis.has(p.playerEmoji)
      ? p.playerEmoji
      : undefined;

  const heroColorTheme =
    typeof p.heroColorTheme === "string" && isColorThemeId(p.heroColorTheme)
      ? p.heroColorTheme
      : undefined;

  const heroName =
    typeof p.heroName === "string"
      ? normalizeHeroName(p.heroName) || undefined
      : undefined;
  const heroLabel =
    typeof p.heroLabel === "string"
      ? normalizeHeroName(p.heroLabel) || undefined
      : undefined;

  return {
    bestWave: clampInt(p.bestWave, 0, campaignWaves, 0),
    runsPlayed: clampInt(p.runsPlayed, 0, 999_999, 0),
    colorMode: parseColorMode(p.colorMode),
    playerEmoji,
    heroName,
    heroLabel,
    heroColorTheme,
    setupActive: p.setupActive === true,
  };
}

export function sanitizeSavedHeroName(
  heroName: string | undefined,
  heroLabel: string | undefined,
  fallbackLabel: string
): string {
  const raw = heroName ?? heroLabel ?? fallbackLabel;
  const normalized = normalizeHeroName(raw);
  if (normalized) {
    return normalized;
  }
  const fallback = normalizeHeroName(fallbackLabel);
  return fallback || fallbackLabel.slice(0, HERO_NAME_MAX_LENGTH);
}

export type SnapshotPlayer = {
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  emoji: string;
};

export type SnapshotFoe = {
  id: string;
  name: string;
  emoji: string;
  hp: number;
  maxHp: number;
  attack: number;
  level: number;
};

export function sanitizeSnapshotPlayer(
  raw: unknown,
  wave: number,
  allowedHeroEmojis: ReadonlySet<string>,
  defaultEmoji: string,
  fallbackName: string
): SnapshotPlayer {
  const p = parseSaveRecord(raw) ?? {};
  const stats = playerStatsForWave(wave);
  const emoji =
    typeof p.emoji === "string" && allowedHeroEmojis.has(p.emoji)
      ? p.emoji
      : defaultEmoji;
  const maxHp = stats.maxHp;
  const hp = clampInt(p.hp, 0, maxHp, maxHp);
  const rawName = typeof p.name === "string" ? p.name : fallbackName;
  const name = sanitizeSavedHeroName(rawName, undefined, fallbackName);
  return { name, hp, maxHp, attack: stats.attack, emoji };
}

export function sanitizeSnapshotFoe(
  raw: unknown,
  wave: number,
  foesById: ReadonlyMap<string, FoeTemplate>
): SnapshotFoe | null {
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

export function sanitizeGamePhase(value: unknown): GamePhase {
  return typeof value === "string" && GAME_PHASES.has(value as GamePhase)
    ? (value as GamePhase)
    : "combat";
}

export function sanitizeWave(value: unknown, campaignWaves = CAMPAIGN_WAVE_COUNT): number {
  return clampInt(value, 1, campaignWaves, 1);
}

export function sanitizeTurn(value: unknown): number {
  return clampInt(value, 1, 99_999, 1);
}

export function sanitizeHypeLevel(value: unknown): number {
  return clampHype(typeof value === "number" && Number.isFinite(value) ? value : 0);
}

export function sanitizeIdList(value: unknown, validIds: ReadonlySet<string>): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const ids = value.filter((id): id is string => typeof id === "string" && validIds.has(id));
  return ids.length > 0 ? ids : undefined;
}

export function isDebugHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}
