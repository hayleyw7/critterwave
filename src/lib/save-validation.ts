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
  const id = typeof p.id === "string" ? canonicalFoeId(p.id) : "";
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

/** Maps retired foe template ids to current ids when loading saves. */
const LEGACY_FOE_ID_ALIASES: Readonly<Record<string, string>> = {
  "bad-badger": "baneful-badger",
  "batty-butterfly": "batty-butter",
  "beastly-bat": "berserk-bat",
  "beastly-bee": "bullying-bee",
  "beastly-boar": "barren-boar",
  "biting-beetle": "barbed-beetle",
  "bloated-blowfish": "bloated-blob",
  "bold-bison": "boorish-bison",
  "brutal-brontosaurus": "brutal-bronto",
  "bumbling-beaver": "belligerent-beav",
  "burly-bear": "baleful-bear",
  "burly-buffalo": "beastly-buffalo",
  "callous-camel": "coy-camel",
  "cheeky-chicken": "chaotic-chicken",
  "cheeky-chipmunk": "churlish-chip",
  "crabby-crab": "crazed-crab",
  "creepy-coral": "cold-coral",
  "cruel-crocodile": "cruel-croc",
  "cruel-crow": "craven-crow",
  "cunning-cat": "conniving-cat",
  "cursed-cockroach": "rotten-roach",
  "diabolic-devil": "devious-devil",
  "devious-deer": "demonic-deer",
  "devious-dolphin": "deranged-dolphin",
  "devious-dove": "dour-dove",
  "dreadful-dragon": "dreadful-drake",
  "evil-eagle": "eerie-eagle",
  "evil-elephant": "empty-elephant",
  "flamboyant-flamingo": "flabby-flamingo",
  "flimsy-fly": "flagrant-fly",
  "freaky-frog": "frowzy-frog",
  "ghastly-goblin": "ghoul-goblin",
  "giant-giraffe": "gaunt-giraffe",
  "goofy-goat": "guilty-goat",
  "goofy-goose": "gaudy-goose",
  "horrible-hamster": "horrible-hammy",
  "horrible-hedgehog": "heinous-hog",
  "hostile-hippo": "hateful-hippo",
  "jaded-jellyfish": "jaded-jelly",
  "kooky-kangaroo": "rowdy-roo",
  "kooky-koala": "knavish-koala",
  "loathsome-ladybug": "lazy-lady",
  "loathsome-lion": "lousy-lion",
  "loathsome-lizard": "lurid-liz",
  "loathsome-llama": "leery-llama",
  "loathsome-lobster": "limp-lob",
  "mad-mammoth": "mighty-mammoth",
  "malicious-mosquito": "mangy-mozzie",
  "moody-moose": "morose-moose",
  "obnoxious-octopus": "oppressive-octo",
  "obnoxious-orangutan": "obnoxious-orang",
  "obnoxious-ox": "obstinate-ox",
  "odious-ogre": "obtuse-ogre",
  "odious-otter": "ornery-otter",
  "odious-oyster": "oily-oyster",
  "pesky-phoenix": "phony-phoenix",
  "petty-panda": "puny-panda",
  "petty-penguin": "pasty-penguin",
  "petulant-parrot": "petulant-polly",
  "placid-polar-bear": "putrid-polar",
  "pompous-poodle": "peevish-poodle",
  "posh-peacock": "perilous-peacock",
  "rabid-raccoon": "ravenous-raccoon",
  "rotten-rooster": "raging-rooster",
  "rowdy-rooster": "raging-rooster",
  "savage-seal": "sullen-seal",
  "shaggy-sheep": "shoddy-sheep",
  "shocking-shark": "shifty-shark",
  "shrill-shrimp": "skrill-skrimp",
  "sketchy-skeleton": "sketchy-skelly",
  "skittish-skunk": "skulking-skunk",
  "skulking-skeleton": "sketchy-skelly",
  "odious-owl": "outcast-owl",
  "slothful-sloth": "sluggish-sloth",
  "sneaky-snail": "snotty-snail",
  "sneaky-snake": "snide-snake",
  "soggy-snowman": "snappy-snowman",
  "squishy-squid": "squalid-squid",
  "swanky-swan": "swollen-swan",
  "terrible-trex": "toxic-t-rex",
  "terrible-turtle": "torrid-turtle",
  "unhinged-unicorn": "useless-uni",
  "wicked-worm": "wimpy-worm",
  "zealous-zebra": "zapped-zebra",
};

export function canonicalFoeId(id: string): string {
  let current = id;
  const seen = new Set<string>();
  while (LEGACY_FOE_ID_ALIASES[current] && !seen.has(current)) {
    seen.add(current);
    current = LEGACY_FOE_ID_ALIASES[current]!;
  }
  return current;
}

export function sanitizeIdList(value: unknown, validIds: ReadonlySet<string>): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const ids = value
    .map((id) => (typeof id === "string" ? canonicalFoeId(id) : id))
    .filter((id): id is string => typeof id === "string" && validIds.has(id));
  return ids.length > 0 ? ids : undefined;
}

export function isDebugHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}
