import type { ColorThemeId } from "../lib/color-themes.js";
import type { ColorMode } from "../lib/color-mode.js";
import type { PendingConfirmKind } from "../lib/save-validation.js";
import type { CombatHintsState } from "../lib/combat-hints.js";

export type Player = {
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  emoji: string;
};

export type Enemy = {
  id: string;
  name: string;
  emoji: string;
  hp: number;
  maxHp: number;
  attack: number;
  level: number;
};

export type FoeTemplate = {
  id: string;
  /** Two words; adjective + creature must share the same opening sound. */
  name: string;
  emoji: string;
  baseHp: number;
  baseAtk: number;
};

export type HeroOption = {
  id: string;
  label: string;
  emoji: string;
};

export type FoeColorTheme = ColorThemeId;
export type HeroColorTheme = ColorThemeId;

export type SaveData = {
  bestWave: number;
  runsPlayed: number;
  colorMode?: ColorMode;
  playerEmoji?: string;
  /** Custom display name chosen by the player. */
  heroName?: string;
  /** @deprecated Legacy — creature label; use heroName when present. */
  heroLabel?: string;
  heroColorTheme?: HeroColorTheme;
  /** True while the hero setup overlay should stay up (survives refresh). */
  setupActive?: boolean;
  /** Footer confirm dialog open — restored after refresh until dismissed. */
  pendingConfirm?: PendingConfirmKind;
};

export type BattleLogEntry = {
  title?: string;
  waveTitle?: { wave: number; attempt: number };
  wave: number;
  turn: number;
  action?: "Attack" | "Heal" | "Dance" | "Run";
  playerAttack: number;
  playerPower: number;
  foeAttack: number | null;
  foePower: number | null;
  foeColorTheme: FoeColorTheme;
  lines: { text: string; kind: "info" | "player" | "foe" | "win" | "lose" }[];
};

export type GameSnapshot = {
  player: Player;
  foe: Enemy | null;
  turn: number;
  wave: number;
  phase: "combat" | "gameover" | "victory";
  hypeLevel: number;
  foeHypeLevel: number;
  /** Shuffled foe sequence for this run (foe template ids). */
  foeOrderIds?: string[];
  /** Active foe queue — front is the current encounter. */
  foeQueueIds?: string[];
  /** Foes fled from; appended after the queue empties. */
  deferredFoeIds?: string[];
  foeColorTheme?: FoeColorTheme;
  heroColorTheme?: HeroColorTheme;
  combatHints?: CombatHintsState;
  battleLogHistory?: BattleLogEntry[];
};

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

export type LegacySnapshot = GameSnapshot & {
  goblin?: Enemy | null;
  goblinHypeLevel?: number;
};

export type CombatTeachPopupId = "cmd-heal-teach" | "cmd-dance-teach" | "cmd-run-teach";
export type DebugCombatAction = "attack" | "heal" | "dance" | "run";
