import { FOES as FOES_RAW } from "./data/foes-data.js";
import { assertAlliterativeName } from "./lib/alliteration.js";
import {
  buildFoeOrder as buildFoeOrderForHero,
  CAMPAIGN_WAVE_COUNT,
  DEFEAT_VERBS,
  foeColorConflictsWithHero as heroFoeColorConflicts,
  formatFoeInText as formatFoeMessage,
  formatSetupBlockerMessage,
  getSetupBlockers as getSetupBlockersForInput,
  HERO_NAME_MAX_LENGTH,
  HYPE_ATTACK_PER_LEVEL,
  HYPE_MAX,
  applyPlayerHealRoll,
  applyHypeGain,
  hypeAfterTakingHit,
  applyPlayerStatsForWave,
  clampHype,
  formatHypeLabel as formatHypeStatLabel,
  healHpAfterWaveVictory,
  hypeHeadroom,
  isLevelBandFinale,
  advanceFoeQueueAfterFlee,
  advanceFoeQueueAfterVictory,
  buildInitialFoeQueue,
  buildQueueCycleFromWave,
  makeFoeFromQueueHead,
  makeFoeFromTemplate,
  nextDefeatVerb as advanceDefeatVerb,
  pickFoeFromOrder,
  playerLevelForWave,
  playerStatsForWave,
  refreshWaveFoeFromTemplate,
  WAVES_PER_LEVEL,
  xpProgressForDisplay,
  xpProgressForWave,
  xpPercentForDisplay,
  xpPercentForWave,
  heroLabelFromFoeName,
  normalizeHeroName,
  restoreFoeOrder as restoreFoeOrderForHero,
  randomDamage,
} from "./lib/game-logic.js";
import {
  formatDanceHypeTail,
  getPlayerHypeGain,
  getFoeHypeGain,
  pickRandomDanceOpener,
  pickRandomDanceResponse,
  pickFirstDanceResponse,
  resetDancePicker,
} from "./content/dance-responses.js";
import { appendBattleLine, setBattleLines } from "./lib/battle-log-dom.js";
import {
  clampInt,
  isDebugHost,
  parsePendingConfirm,
  parseSaveMeta,
  type PendingConfirmKind,
  sanitizeGamePhase,
  sanitizeHypeLevel,
  sanitizeIdList,
  sanitizeSavedHeroName,
  sanitizeSnapshotFoe,
  sanitizeSnapshotPlayer,
  sanitizeTurn,
  sanitizeWave,
} from "./lib/save-validation.js";
import {
  assertHeroPickerOrderCovers,
  heroPickerOrderIndex,
  HERO_PICKER_ORDER,
  isHeroEmojiHiddenInPicker,
  isMobileHeroPickerViewport,
  resolveHeroPickerEmoji,
} from "./lib/hero-groups.js";
import {
  COLOR_THEME_IDS,
  COLOR_THEMES,
  DEFAULT_COLOR_THEME,
  getColorTheme,
  colorThemeSurfaces,
  isColorThemeId,
  type ColorThemeId,
  type ColorThemeSurfaces,
} from "./lib/color-themes.js";
import {
  applyColorMode,
  parseColorMode,
  runColorModeTransition,
  type ColorMode,
} from "./lib/color-mode.js";
import {
  beginAwaitingFoeResponse,
  blockCombatForScreenEnd,
  canUseCombatActions as canUseCombatActionsGate,
  finishCombatAction as finishCombatActionGate,
  foeFollowUpDelayMs,
  FOE_FOLLOW_UP_DELAY_MS,
  isFollowUpTimerStale,
  resetCombatGate,
  tryLockCombat as tryLockCombatGate,
  type CombatGateState,
} from "./lib/combat-gate.js";
import {
  createCombatHintsState,
  combatHintsAfterMidRunRestore,
  combatHintsForSnapshot,
  attackTeachText,
  deferDanceHintAfterRun,
  maybeArmDanceHintForWave,
  onNextFoeForHints,
  onVictoryForHints,
  recordAttackForHints,
  recordDanceForHints,
  recordHealForHints,
  recordPlayerDamageForHints,
  tryCelebrateFirstFoeHype,
  tryCelebrateFirstPlayerHype,
  tryCelebrateFirstWaveVictoryHeal,
  hypeMaxPresentation,
  recordRunForHints,
  shouldShowAttackHint,
  shouldShowDanceHint,
  shouldShowDanceTeachCopy,
  shouldShowHealHint,
  shouldShowHealTeachCopy,
  shouldShowRunHint,
  shouldShowRunTeachCopy,
  type CombatHintsState,
} from "./lib/combat-hints.js";
import {
  startVictoryCelebration,
  stopVictoryCelebration,
} from "./ui/victory-celebration.js";

const HYPE_METER_FLASH_MS = 450 * 3 + 50;
declare global {
  interface Window {
    critterwave?: { win: () => void };
  }
}

type Player = {
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  emoji: string;
};

type Enemy = {
  id: string;
  name: string;
  emoji: string;
  hp: number;
  maxHp: number;
  attack: number;
  level: number;
};

type FoeTemplate = {
  id: string;
  /** Two words; adjective + creature must share the same opening sound. */
  name: string;
  emoji: string;
  baseHp: number;
  baseAtk: number;
};

type HeroOption = {
  id: string;
  label: string;
  emoji: string;
};

const FOE_COLOR_THEMES = COLOR_THEME_IDS;
type FoeColorTheme = ColorThemeId;

function normalizeFoeColorTheme(theme: string | undefined): FoeColorTheme {
  if (theme && isColorThemeId(theme)) {
    return theme;
  }
  return "amber";
}

type HeroColorTheme = ColorThemeId;
const DEFAULT_HERO_COLOR_THEME: HeroColorTheme = DEFAULT_COLOR_THEME;

type SaveData = {
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

type GameSnapshot = {
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

const STORAGE_KEY = "critterwave-v5";
let currentColorMode: ColorMode = "dark";
const CAMPAIGN_WAVES = CAMPAIGN_WAVE_COUNT;
const FOE_POOF_MS = 450;
const FOE_ENTRANCE_MS = 550;
const DEATH_BEAT_MS = 1200;
const GOLD_FLASH_MS = 650;
const HEAL_ANIM_MS = 420;
const DANCE_ANIM_MS = 550;
const XP_FILL_BEAT_MS = 220;
const DEFAULT_HERO_EMOJI = "🐱";
const DEFAULT_HERO_LABEL = "Cat";
const DEFAULT_PLAYER_NAME = "Dingus";

function assertUniqueEmojis(entries: { emoji: string; name?: string; label?: string }[]): void {
  const seen = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.emoji)) {
      throw new Error(`Duplicate emoji ${entry.emoji} (${entry.name ?? entry.label})`);
    }
    seen.add(entry.emoji);
  }
}

function heroesFromFoes(foes: FoeTemplate[]): HeroOption[] {
  return foes.map((foe) => ({
    id: foe.id,
    label: heroLabelFromFoeName(foe.name),
    emoji: foe.emoji,
  }));
}

const FOES: FoeTemplate[] = FOES_RAW.map((f) => ({ ...f }));
const HEROES: HeroOption[] = heroesFromFoes(FOES).sort(
  (a, b) => heroPickerOrderIndex(a.emoji) - heroPickerOrderIndex(b.emoji)
);
const HERO_EMOJIS = new Set(HEROES.map((hero) => hero.emoji));
const FOES_BY_ID = new Map(FOES.map((foe) => [foe.id, foe]));
const FOE_IDS = new Set(FOES.map((foe) => foe.id));

for (const foe of FOES) {
  assertAlliterativeName(foe.name);
}
assertUniqueEmojis(FOES);
assertHeroPickerOrderCovers(FOES.map((f) => f.emoji));
function buildFoeOrder(heroEmoji: string): FoeTemplate[] {
  return buildFoeOrderForHero(FOES, heroEmoji);
}

function restoreFoeQueueState(
  snapshot: GameSnapshot,
  order: FoeTemplate[]
): { queue: string[]; deferred: string[] } {
  if (snapshot.foeQueueIds && snapshot.foeQueueIds.length > 0) {
    return {
      queue: snapshot.foeQueueIds,
      deferred: snapshot.deferredFoeIds ?? [],
    };
  }
  const cycle = buildQueueCycleFromWave(order, snapshot.wave);
  if (snapshot.foe?.id) {
    const idx = cycle.indexOf(snapshot.foe.id);
    if (idx >= 0) {
      return { queue: cycle.slice(idx), deferred: [] };
    }
  }
  return { queue: cycle, deferred: [] };
}

function spawnFoeFromQueue(): Enemy {
  return makeFoeFromQueueHead(foeQueue, foeOrder, wave);
}

function getCampaignLength(): number {
  return CAMPAIGN_WAVES;
}

function getHealMax(): number {
  return playerStatsForWave(wave).healMax;
}

function syncPlayerForCurrentWave(options?: {
  healToMax?: boolean;
  grantMaxHpIncrease?: boolean;
}): number {
  const next = applyPlayerStatsForWave(wave, player, options);
  player.hp = next.hp;
  player.maxHp = next.maxHp;
  player.attack = next.attack;
  return next.level;
}

function refreshFoeStatsPreservingHp(): void {
  const currentFoe = foe;
  if (!currentFoe || foeOrder.length === 0) {
    return;
  }
  const template =
    foeOrder.find((entry) => entry.id === currentFoe.id) ??
    pickFoeFromOrder(foeOrder, wave);
  const refreshed = refreshWaveFoeFromTemplate(currentFoe.hp, template, wave);
  currentFoe.maxHp = refreshed.maxHp;
  currentFoe.attack = refreshed.attack;
  currentFoe.level = refreshed.level;
  currentFoe.hp = refreshed.hp;
}

function restoreFoeOrder(ids: string[] | undefined, heroEmoji: string): FoeTemplate[] {
  return restoreFoeOrderForHero(ids, heroEmoji, FOES);
}

const player: Player = {
  name: DEFAULT_PLAYER_NAME,
  hp: 20,
  maxHp: 20,
  attack: 5,
  emoji: DEFAULT_HERO_EMOJI,
};

let foe: Enemy | null = null;
let foeOrder: FoeTemplate[] = [];
let foeQueue: string[] = [];
let deferredFoeIds: string[] = [];
let turn = 1;
let wave = 1;
let hypeLevel = 0;
let foeHypeLevel = 0;
let phase: GameSnapshot["phase"] = "combat";
let combatHints: CombatHintsState = createCombatHintsState();
let pendingHeroEmoji = DEFAULT_HERO_EMOJI;
let pendingHeroLabel = DEFAULT_HERO_LABEL;
let heroColorTheme: HeroColorTheme = DEFAULT_HERO_COLOR_THEME;
let pendingHeroColorTheme: HeroColorTheme = DEFAULT_HERO_COLOR_THEME;
let foeColorTheme: FoeColorTheme = "amber";
let lastFoeColorTheme: FoeColorTheme | null = null;
let defeatVerbIndex = 0;
/** Blocks combat buttons during counters, run, wave change, death anim, etc. */
let combatBusy = false;
let combatActionGeneration = 0;
/** After attack/heal until foe counter finishes — one hero strike per foe response. */
let awaitingFoeResponse = false;
/** Keep showing the fleeing foe until exit poof finishes (run away). */
let suppressFoePanelRender = false;
let displayedPlayerHype = 0;
let displayedFoeHype = 0;
/** Skip first-HYPE teach on the render beat right after Heal (gain may be lost to counter). */
let skipPlayerHypeTeachThisRender = false;
/** Skip HYPE teach pulses on the first render after mid-run restore. */
let suppressTeachFlashesThisRender = false;
const el = {
  arena: document.getElementById("arena")!,
  battleStage: document.getElementById("battle-stage")!,
  playerPanel: document.getElementById("player-panel")!,
  playerStatus: document.querySelector("#player-panel .hero-status") as HTMLElement,
  foePanel: document.getElementById("foe-panel")!,
  foeStatus: document.querySelector("#foe-panel .enemy-status") as HTMLElement,
  damageLayer: document.getElementById("damage-layer")!,
  heroLevelUpLayer: document.getElementById("hero-level-up-layer")!,
  xpBar: document.getElementById("xp-bar")!,
  xpFill: document.getElementById("xp-fill")!,
  xpText: document.getElementById("xp-text")!,
  bestWave: document.getElementById("stat-best-wave")!,
  runs: document.getElementById("stat-runs")!,
  waveBanner: document.getElementById("wave-banner")!,
  playerHpFill: document.getElementById("player-hp-fill")!,
  playerHpText: document.getElementById("player-hp-text")!,
  playerLevel: document.getElementById("player-level")!,
  playerAttack: document.getElementById("player-attack")!,
  playerBuff: document.getElementById("player-buff")!,
  playerHypeWrap: document.getElementById("player-hype-wrap")!,
  playerHypeBar: document.getElementById("player-hype-bar")!,
  playerHypeFill: document.getElementById("player-hype-fill")!,
  playerEmoji: document.getElementById("hero-emoji")!,
  playerName: document.getElementById("hero-name")!,
  foeName: document.getElementById("foe-name")!,
  foeLevel: document.getElementById("foe-level")!,
  foeAttack: document.getElementById("foe-attack")!,
  foeBuff: document.getElementById("foe-buff")!,
  foeHypeWrap: document.getElementById("foe-hype-wrap")!,
  foeHypeBar: document.getElementById("foe-hype-bar")!,
  foeHypeFill: document.getElementById("foe-hype-fill")!,
  foeEmoji: document.getElementById("foe-emoji")!,
  foeHpFill: document.getElementById("foe-hp-fill")!,
  foeHpText: document.getElementById("foe-hp-text")!,
  turnLabel: document.getElementById("turn-label")!,
  battleText: document.getElementById("battle-text")!,
  actions: document.getElementById("actions")!,
  healBtn:
    document.getElementById("cmd-heal") ??
    document.querySelector<HTMLButtonElement>('[data-action="heal"]')!,
  danceBtn:
    document.getElementById("cmd-dance") ??
    document.querySelector<HTMLButtonElement>('[data-action="dance"]')!,
  attackBtn:
    document.getElementById("cmd-attack") ??
    document.querySelector<HTMLButtonElement>('[data-action="attack"]')!,
  healTeachPopup: document.getElementById("cmd-heal-teach")!,
  danceTeachPopup: document.getElementById("cmd-dance-teach")!,
  runTeachPopup: document.getElementById("cmd-run-teach")!,
  runBtn:
    document.getElementById("cmd-run") ??
    document.querySelector<HTMLButtonElement>('[data-action="run"]')!,
  recordsBar: document.querySelector(".records-bar") as HTMLElement,
  gameOver: document.getElementById("game-over")!,
  victoryEmojiLayer: document.getElementById("victory-emoji-layer")!,
  gameOverTag: document.getElementById("game-over-tag")!,
  gameOverSummary: document.getElementById("game-over-summary")!,
  gameOverBattleLog: document.getElementById("game-over-battle-log")!,
  restartLabel: document.querySelector("#restart-btn .cmd-label")!,
  restartBtn: document.getElementById("restart-btn")!,
  quitBtn: document.getElementById("quit-btn")!,
  resetStatsBtn: document.getElementById("reset-stats-btn")!,
  helpBtn: document.getElementById("help-btn")!,
  helpOverlay: document.getElementById("help-overlay")!,
  helpPanel: document.getElementById("help-panel")!,
  helpClose: document.getElementById("help-close")!,
  themeToggle: document.getElementById("theme-toggle")!,
  themeToggleIcon: document.querySelector("#theme-toggle .theme-toggle-icon")!,
  confirmOverlay: document.getElementById("confirm-overlay")!,
  confirmPanel: document.getElementById("confirm-panel")!,
  confirmTitle: document.getElementById("confirm-title")!,
  confirmMessage: document.getElementById("confirm-message")!,
  confirmOk: document.getElementById("confirm-ok")!,
  confirmCancel: document.getElementById("confirm-cancel")!,
  setupOverlay: document.getElementById("character-setup")!,
  setupSubtitle: document.getElementById("setup-subtitle")!,
  heroPicker: document.getElementById("hero-picker")!,
  heroNameInput: document.getElementById("hero-name-input") as HTMLInputElement,
  heroColorSwatches: document.getElementById("hero-color-swatches")!,
  heroColorToggle: document.getElementById("hero-color-toggle") as HTMLButtonElement,
  heroColorPopup: document.getElementById("hero-color-popup")!,
  setupStartBtn: document.getElementById("setup-start-btn") as HTMLButtonElement,
  setupHint: document.getElementById("setup-hint")!,
  gameShell: document.querySelector(".game-shell") as HTMLElement,
};

let setupHintForced = false;
let setupColorPickerBound = false;
let waveAttempt = 1;
type BattleLogEntry = {
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
const battleLogHistory: BattleLogEntry[] = [];

function sanitizeBattleLogHistory(raw: unknown): BattleLogEntry[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const entries: BattleLogEntry[] = [];
  for (const entry of raw.slice(-200)) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const linesRaw = Array.isArray(record.lines) ? record.lines : [];
    const lines = linesRaw
      .map((line) => {
        if (!line || typeof line !== "object") return null;
        const lineRecord = line as Record<string, unknown>;
        const text = typeof lineRecord.text === "string" ? lineRecord.text : "";
        const kind = lineRecord.kind;
        if (
          kind !== "info" &&
          kind !== "player" &&
          kind !== "foe" &&
          kind !== "win" &&
          kind !== "lose"
        ) {
          return null;
        }
        return { text: text.slice(0, 240), kind };
      })
      .filter((line): line is BattleLogEntry["lines"][number] => !!line);
    const action = record.action;
    const safeAction =
      action === "Attack" || action === "Heal" || action === "Dance" || action === "Run"
        ? action
        : undefined;
    const wave = clampInt(record.wave, 1, CAMPAIGN_WAVES, 1);
    const attempt = clampInt(
      (record.waveTitle as Record<string, unknown> | undefined)?.attempt,
      1,
      99,
      1
    );
    const waveTitle =
      record.waveTitle && typeof record.waveTitle === "object"
        ? { wave, attempt }
        : undefined;
    entries.push({
      title: typeof record.title === "string" ? record.title.slice(0, 80) : undefined,
      waveTitle,
      wave,
      turn: clampInt(record.turn, 1, 99_999, 1),
      action: safeAction,
      playerAttack: clampInt(record.playerAttack, 0, 999, 0),
      playerPower: clampInt(record.playerPower, 0, HYPE_MAX, 0),
      foeAttack:
        typeof record.foeAttack === "number"
          ? clampInt(record.foeAttack, 0, 999, 0)
          : null,
      foePower:
        typeof record.foePower === "number"
          ? clampInt(record.foePower, 0, HYPE_MAX, 0)
          : null,
      foeColorTheme:
        typeof record.foeColorTheme === "string" && isColorThemeId(record.foeColorTheme)
          ? record.foeColorTheme
          : "amber",
      lines,
    });
  }
  return entries.length > 0 ? entries : undefined;
}

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

const PENDING_CONFIRM_OPTIONS: Record<PendingConfirmKind, ConfirmOptions> = {
  newRun: {
    title: "Start a new run?",
    message:
      "Your high score and run count stay. This run can't be continued.",
    confirmLabel: "New Run",
  },
  clearData: {
    title: "Delete everything?",
    message:
      "Permanently delete your critter and all-time play history. This can't be undone.",
    confirmLabel: "Clear Data",
    danger: true,
  },
};

let confirmResolve: ((confirmed: boolean) => void) | null = null;

function applyConfirmOptions(options: ConfirmOptions): void {
  el.confirmTitle.textContent = options.title;
  el.confirmMessage.textContent = options.message;
  el.confirmOk.textContent = options.confirmLabel ?? "Yes";
  el.confirmCancel.textContent = options.cancelLabel ?? "Cancel";
  el.confirmOverlay.classList.toggle("confirm-danger", options.danger ?? false);
  el.confirmOverlay.classList.remove("hidden");
}

function persistPendingConfirm(kind: PendingConfirmKind | null): void {
  const fields = readPersistedFields();
  if (kind) {
    fields.pendingConfirm = kind;
  } else {
    delete fields.pendingConfirm;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(withSaveMeta(fields)));
}

function presentConfirm(
  kind: PendingConfirmKind,
  onConfirm: () => void
): Promise<boolean> {
  return new Promise((resolve) => {
    applyConfirmOptions(PENDING_CONFIRM_OPTIONS[kind]);
    persistPendingConfirm(kind);
    confirmResolve = (confirmed) => {
      persistPendingConfirm(null);
      el.confirmOverlay.classList.add("hidden");
      el.confirmOverlay.classList.remove("confirm-danger");
      confirmResolve = null;
      if (confirmed) {
        onConfirm();
      }
      resolve(confirmed);
    };
    el.confirmCancel.focus();
  });
}

function closeConfirm(confirmed: boolean): void {
  const resolve = confirmResolve;
  if (!resolve) {
    return;
  }
  resolve(confirmed);
}

function restorePendingConfirmIfNeeded(): void {
  const kind = loadSave().pendingConfirm;
  if (!kind) {
    return;
  }
  void presentConfirm(kind, () => {
    if (kind === "newRun") {
      applyNewRun();
    } else {
      applyClearData();
    }
  });
}

function isConfirmBackdropTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Node)) {
    return false;
  }
  return !el.confirmPanel.contains(target);
}

function dismissConfirmFromBackdrop(event: Event): void {
  if (el.confirmOverlay.classList.contains("hidden")) {
    return;
  }
  if (!isConfirmBackdropTarget(event.target)) {
    return;
  }
  if (event instanceof PointerEvent && event.button !== 0) {
    return;
  }
  event.preventDefault();
  closeConfirm(false);
}

function bindConfirmDialog(): void {
  el.confirmOk.addEventListener("click", () => {
    closeConfirm(true);
  });

  el.confirmCancel.addEventListener("click", () => {
    closeConfirm(false);
  });

  el.confirmOverlay.addEventListener("click", dismissConfirmFromBackdrop);
  el.confirmOverlay.addEventListener("pointerup", dismissConfirmFromBackdrop);

  document.addEventListener("keydown", (event) => {
    if (el.confirmOverlay.classList.contains("hidden")) {
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeConfirm(false);
    }
  });
}

function getStorageRaw(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

function loadSave(): SaveData {
  try {
    const raw = getStorageRaw();
    if (!raw) {
      return { bestWave: 0, runsPlayed: 0, colorMode: currentColorMode };
    }
    return parseSaveMeta(JSON.parse(raw) as unknown, {
      allowedHeroEmojis: HERO_EMOJIS,
      campaignWaves: CAMPAIGN_WAVES,
    });
  } catch {
    return { bestWave: 0, runsPlayed: 0, colorMode: currentColorMode };
  }
}

function withSaveMeta(fields: Record<string, unknown> = {}): Record<string, unknown> {
  const save = loadSave();
  return {
    bestWave: save.bestWave,
    runsPlayed: save.runsPlayed,
    colorMode: currentColorMode,
    ...fields,
  };
}

function initColorMode(): void {
  currentColorMode = parseColorMode(loadSave().colorMode);
  applyColorMode(currentColorMode);
  updateThemeToggleUi();
  applyHeroColorTheme(heroColorTheme);
  applyFoeColorTheme(foeColorTheme);
}

function updateThemeToggleUi(): void {
  const isDark = currentColorMode === "dark";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";
  el.themeToggle.setAttribute("aria-pressed", isDark ? "false" : "true");
  el.themeToggle.setAttribute("aria-label", label);
  el.themeToggle.setAttribute("title", label);
  el.themeToggleIcon.textContent = isDark ? "☀" : "☾";
}

function toggleColorMode(): void {
  currentColorMode = currentColorMode === "dark" ? "light" : "dark";
  runColorModeTransition(() => {
    applyColorMode(currentColorMode);
    updateThemeToggleUi();
    applyHeroColorTheme(heroColorTheme);
    applyFoeColorTheme(foeColorTheme);
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(withSaveMeta(readPersistedFields())));
}

function readPersistedFields(): Record<string, unknown> {
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

type LegacySnapshot = GameSnapshot & {
  goblin?: Enemy | null;
  goblinHypeLevel?: number;
};

function loadSnapshot(): GameSnapshot | null {
  try {
    const raw = getStorageRaw();
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { snapshot?: LegacySnapshot };
    const snap = parsed.snapshot;
    if (!snap) return null;
    return normalizeSnapshot(snap);
  } catch {
    return null;
  }
}

function normalizeSnapshot(snap: LegacySnapshot): GameSnapshot {
  const wave = sanitizeWave(snap.wave, CAMPAIGN_WAVES);
  const legacyFoe = snap.foe ?? snap.goblin;
  const playerEmoji =
    typeof snap.player?.emoji === "string" ? snap.player.emoji : DEFAULT_HERO_EMOJI;
  const player = sanitizeSnapshotPlayer(
    snap.player,
    wave,
    HERO_EMOJIS,
    DEFAULT_HERO_EMOJI,
    getHeroLabelForEmoji(playerEmoji)
  );
  const foeNormalized = legacyFoe
    ? sanitizeSnapshotFoe(legacyFoe, wave, FOES_BY_ID)
    : null;

  return {
    player,
    foe: foeNormalized,
    turn: sanitizeTurn(snap.turn),
    wave,
    phase: sanitizeGamePhase(snap.phase),
    hypeLevel: sanitizeHypeLevel(snap.hypeLevel),
    foeHypeLevel: sanitizeHypeLevel(snap.foeHypeLevel ?? snap.goblinHypeLevel),
    foeOrderIds: sanitizeIdList(snap.foeOrderIds, FOE_IDS),
    foeColorTheme: snap.foeColorTheme,
    heroColorTheme:
      snap.heroColorTheme && isHeroColorTheme(snap.heroColorTheme)
        ? snap.heroColorTheme
        : undefined,
    combatHints: createCombatHintsState(snap.combatHints ?? {}),
    foeQueueIds: sanitizeIdList(snap.foeQueueIds, FOE_IDS),
    deferredFoeIds: sanitizeIdList(snap.deferredFoeIds, FOE_IDS),
    battleLogHistory: sanitizeBattleLogHistory(snap.battleLogHistory),
  };
}

function persistStatsOnly(): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      withSaveMeta({
        playerEmoji: player.emoji,
        heroName: player.name,
        heroColorTheme,
        setupActive: false,
      })
    )
  );
}

function persistSetupDraft(): void {
  if (el.setupOverlay.classList.contains("hidden")) {
    return;
  }
  const name = readHeroNameFromSetup();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      withSaveMeta({
        playerEmoji: pendingHeroEmoji,
        heroName: name || undefined,
        heroColorTheme: pendingHeroColorTheme,
        setupActive: true,
      })
    )
  );
}

function persist(snapshot?: GameSnapshot): void {
  const preserved = readPersistedFields();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      withSaveMeta({
        ...preserved,
        playerEmoji: player.emoji,
        heroName: player.name,
        heroColorTheme,
        setupActive: !el.setupOverlay.classList.contains("hidden"),
        snapshot: snapshot ?? getSnapshot(),
      })
    )
  );
}

function isConfirmDialogOpen(): boolean {
  return !el.confirmOverlay.classList.contains("hidden");
}

/** Set by e2e save patches so pagehide does not overwrite localStorage before reload. */
const SKIP_EXIT_FLUSH_KEY = "critterwave-skip-exit-flush";
const HELP_OPEN_KEY = "critterwave-help-open";

function shouldFlushSnapshotOnPageExit(): boolean {
  try {
    if (sessionStorage.getItem(SKIP_EXIT_FLUSH_KEY) === "1") {
      return false;
    }
  } catch {
    /* sessionStorage unavailable */
  }
  if (isConfirmDialogOpen()) {
    return true;
  }
  if (!el.setupOverlay.classList.contains("hidden")) {
    return false;
  }
  if (phase === "gameover" || phase === "victory") {
    return true;
  }
  return phase === "combat" && foe !== null;
}

/** Keep mid-run state (including teach popups) when the player refreshes or leaves. */
function flushSnapshotOnPageExit(): void {
  if (!shouldFlushSnapshotOnPageExit()) {
    return;
  }
  persist();
}

function bindPageExitPersist(): void {
  window.addEventListener("pagehide", flushSnapshotOnPageExit);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushSnapshotOnPageExit();
    }
  });
}

function foeColorConflictsWithHero(theme: FoeColorTheme): boolean {
  return heroFoeColorConflicts(heroColorTheme, theme);
}

function getAvailableFoeColorThemes(excludeLast: boolean): FoeColorTheme[] {
  let options = FOE_COLOR_THEMES.filter((theme) => !foeColorConflictsWithHero(theme));
  if (excludeLast && lastFoeColorTheme !== null) {
    const withoutLast = options.filter((theme) => theme !== lastFoeColorTheme);
    if (withoutLast.length > 0) {
      options = withoutLast;
    }
  }
  return options;
}

function pickNextFoeColor(): FoeColorTheme {
  let options = getAvailableFoeColorThemes(true);
  if (options.length === 0) {
    options = getAvailableFoeColorThemes(false);
  }
  if (options.length === 0) {
    options = FOE_COLOR_THEMES.filter((theme) => !foeColorConflictsWithHero(theme));
  }
  const picked = options[Math.floor(Math.random() * options.length)] ?? "amber";
  lastFoeColorTheme = picked;
  foeColorTheme = picked;
  return picked;
}

function ensureFoeColorDistinctFromHero(): void {
  if (!foeColorConflictsWithHero(foeColorTheme)) return;
  pickNextFoeColor();
}

function applyFoeColorTheme(theme: FoeColorTheme): void {
  const panel = el.foePanel.querySelector(".enemy-status") as HTMLElement | null;
  if (!panel) return;
  for (const name of FOE_COLOR_THEMES) {
    panel.classList.remove(`foe-theme-${name}`);
  }
  panel.classList.add(`foe-theme-${theme}`);
  const colors = colorThemeSurfaces(getColorTheme(theme), currentColorMode);
  panel.style.setProperty("--foe-accent", colors.accent);
  panel.style.setProperty("--foe-accent-dark", colors.dark);
  panel.style.setProperty("--foe-panel-bg", colors.panelBg);
  panel.style.setProperty("--foe-plate-bg", colors.plateBg);
  panel.style.setProperty("--foe-plate-text", colors.plateText);
  panel.style.setProperty("--foe-hp-wrap-bg", colors.hpWrapBg);
  panel.style.setProperty("--foe-divider", colors.divider);
  panel.style.setProperty("--foe-buff-bg", colors.buffBg);
  applyCardHypeStatColors(panel, "foe", colors);
  el.gameShell.style.setProperty("--foe-accent", colors.accent);
  el.gameShell.style.setProperty("--foe-accent-dark", colors.dark);
  el.gameShell.style.setProperty(
    "--battle-foe-text",
    currentColorMode === "dark" ? colors.accent : colors.plateText
  );
}

function getSnapshot(): GameSnapshot {
  return {
    player: { ...player },
    foe: foe ? { ...foe } : null,
    turn,
    wave,
    phase,
    hypeLevel,
    foeHypeLevel,
    foeOrderIds: foeOrder.map((f) => f.id),
    foeQueueIds: foeQueue,
    deferredFoeIds,
    foeColorTheme,
    heroColorTheme,
    combatHints: combatHintsForSnapshot(combatHints),
    battleLogHistory: battleLogHistory.map((entry) => ({
      ...entry,
      lines: entry.lines.map((line) => ({ ...line })),
      waveTitle: entry.waveTitle ? { ...entry.waveTitle } : undefined,
    })),
  };
}

function applySnapshot(snapshot: GameSnapshot): void {
  Object.assign(player, snapshot.player);
  foe = snapshot.foe ? { ...snapshot.foe } : null;
  turn = snapshot.turn;
  wave = snapshot.wave;
  waveAttempt = 1;
  phase = snapshot.phase;
  hypeLevel = clampHype(snapshot.hypeLevel ?? 0);
  foeHypeLevel = clampHype(snapshot.foeHypeLevel ?? 0);
  displayedPlayerHype = hypeLevel;
  displayedFoeHype = foeHypeLevel;
  suppressTeachFlashesThisRender = true;
  combatHints = combatHintsAfterMidRunRestore(
    createCombatHintsState(snapshot.combatHints ?? {}),
    hypeLevel,
    foeHypeLevel
  );
  foeOrder = restoreFoeOrder(snapshot.foeOrderIds, snapshot.player.emoji);
  const queueState = restoreFoeQueueState(snapshot, foeOrder);
  foeQueue = queueState.queue;
  deferredFoeIds = queueState.deferred;
  if (snapshot.heroColorTheme) {
    applyHeroColorTheme(snapshot.heroColorTheme);
  }
  foeColorTheme = normalizeFoeColorTheme(snapshot.foeColorTheme);
  lastFoeColorTheme = foeColorTheme;
  ensureFoeColorDistinctFromHero();
  applyFoeColorTheme(foeColorTheme);
  battleLogHistory.splice(
    0,
    battleLogHistory.length,
    ...(snapshot.battleLogHistory ?? [])
  );
  if (wave > CAMPAIGN_WAVES) {
    wave = CAMPAIGN_WAVES;
  }
  syncPlayerForCurrentWave();
  refreshFoeStatsPreservingHp();
  combatHints = maybeArmDanceHintForWave(combatHints, wave);
}

function getHeroLabelForEmoji(emoji: string): string {
  return HEROES.find((h) => h.emoji === emoji)?.label ?? DEFAULT_HERO_LABEL;
}

function resolveSavedHeroName(save: SaveData, emoji: string): string {
  return sanitizeSavedHeroName(
    save.heroName,
    save.heroLabel,
    getHeroLabelForEmoji(emoji)
  );
}

function readHeroNameFromSetup(): string {
  return normalizeHeroName(el.heroNameInput.value);
}

function isHeroColorTheme(value: string): value is HeroColorTheme {
  return isColorThemeId(value);
}

function getHeroColorThemeDefinition(theme: HeroColorTheme) {
  return getColorTheme(theme);
}

function resolveHeroColorTheme(save: SaveData): HeroColorTheme {
  if (save.heroColorTheme && isHeroColorTheme(save.heroColorTheme)) {
    return save.heroColorTheme;
  }
  return DEFAULT_HERO_COLOR_THEME;
}

function applyCardHypeStatColors(
  panel: HTMLElement,
  varPrefix: "hero" | "foe",
  colors: ColorThemeSurfaces
): void {
  panel.style.setProperty(
    `--${varPrefix}-hype-text`,
    `color-mix(in srgb, ${colors.accent} 55%, ${colors.dark})`
  );
}

function applyHeroColorTheme(theme: HeroColorTheme): void {
  const colors = colorThemeSurfaces(getColorTheme(theme), currentColorMode);
  heroColorTheme = theme;
  el.playerPanel.style.setProperty("--hero", colors.accent);
  el.playerPanel.style.setProperty("--hero-dark", colors.dark);
  el.playerPanel.style.setProperty("--hero-panel-bg", colors.panelBg);
  el.playerPanel.style.setProperty("--hero-plate-bg", colors.plateBg);
  el.playerPanel.style.setProperty("--hero-plate-text", colors.plateText);
  el.playerPanel.style.setProperty("--hero-hp-wrap-bg", colors.hpWrapBg);
  el.playerPanel.style.setProperty("--hero-divider", colors.divider);
  applyCardHypeStatColors(el.playerPanel, "hero", colors);
  el.gameShell.style.setProperty("--hero", colors.accent);
  el.gameShell.style.setProperty("--hero-dark", colors.dark);
  el.gameShell.style.setProperty(
    "--battle-hero-text",
    currentColorMode === "dark" ? colors.accent : colors.plateText
  );
  el.xpFill.style.background = colors.accent;
}

function updateHeroColorTogglePreview(): void {
  const colors = getHeroColorThemeDefinition(pendingHeroColorTheme);
  const swatch = el.heroColorToggle.querySelector(
    ".setup-color-toggle-swatch"
  ) as HTMLElement | null;
  swatch?.style.setProperty("--swatch-color", colors.accent);
  el.heroColorToggle.setAttribute("aria-label", `Card color: ${colors.label}`);
}

function openHeroColorPopup(): void {
  el.heroColorPopup.classList.remove("hidden");
  el.heroColorToggle.setAttribute("aria-expanded", "true");
}

function closeHeroColorPopup(): void {
  el.heroColorPopup.classList.add("hidden");
  el.heroColorToggle.setAttribute("aria-expanded", "false");
}

function toggleHeroColorPopup(): void {
  if (el.heroColorPopup.classList.contains("hidden")) {
    openHeroColorPopup();
  } else {
    closeHeroColorPopup();
  }
}

function bindSetupColorPicker(): void {
  if (setupColorPickerBound) return;
  setupColorPickerBound = true;
  el.heroColorToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleHeroColorPopup();
  });
  document.addEventListener("click", (e) => {
    if (el.heroColorPopup.classList.contains("hidden")) return;
    const target = e.target as Node;
    if (
      !el.heroColorPopup.contains(target) &&
      !el.heroColorToggle.contains(target)
    ) {
      closeHeroColorPopup();
    }
  });
}

function readHeroColorThemeFromSetup(): HeroColorTheme {
  return pendingHeroColorTheme;
}

function syncHeroColorSwatchSelection(): void {
  for (const btn of el.heroColorSwatches.querySelectorAll<HTMLButtonElement>(
    ".setup-color-swatch"
  )) {
    btn.classList.toggle("selected", btn.dataset.theme === pendingHeroColorTheme);
    btn.setAttribute(
      "aria-checked",
      btn.dataset.theme === pendingHeroColorTheme ? "true" : "false"
    );
  }
}

function buildHeroColorSwatches(): void {
  if (!el.heroColorSwatches) return;
  el.heroColorSwatches.replaceChildren();
  for (const theme of COLOR_THEMES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "setup-color-swatch";
    btn.dataset.theme = theme.id;
    btn.style.setProperty("--swatch-color", theme.accent);
    btn.setAttribute("role", "radio");
    btn.setAttribute("aria-label", theme.label);
    btn.setAttribute("aria-checked", theme.id === pendingHeroColorTheme ? "true" : "false");
    if (theme.id === pendingHeroColorTheme) {
      btn.classList.add("selected");
    }
    btn.addEventListener("click", () => {
      pendingHeroColorTheme = theme.id;
      applyHeroColorTheme(theme.id);
      syncHeroColorSwatchSelection();
      updateHeroColorTogglePreview();
      closeHeroColorPopup();
      persistSetupDraft();
    });
    el.heroColorSwatches.appendChild(btn);
  }
  updateHeroColorTogglePreview();
}

function getSetupBlockers(): string[] {
  return getSetupBlockersForInput(pendingHeroEmoji, el.heroNameInput.value);
}

function updateSetupStartButton(): void {
  const blockers = getSetupBlockers();
  const canStart = blockers.length === 0;
  const nameMissing = blockers.includes("enter your name");
  const hintBlockers = blockers.filter((blocker) => blocker !== "enter your name");

  el.setupStartBtn.disabled = false;
  el.setupStartBtn.classList.toggle("cmd-start-ready", canStart);
  el.heroNameInput.classList.toggle(
    "setup-name-input--highlight",
    setupHintForced && nameMissing
  );
  el.heroNameInput.setAttribute(
    "aria-invalid",
    setupHintForced && nameMissing ? "true" : "false"
  );

  if (canStart || !setupHintForced) {
    if (canStart) {
      setupHintForced = false;
    }
    el.setupHint.hidden = true;
    el.setupHint.textContent = "";
    el.setupHint.classList.remove("setup-hint-error");
    return;
  }

  if (hintBlockers.length === 0) {
    el.setupHint.hidden = true;
    el.setupHint.textContent = "";
    el.setupHint.classList.remove("setup-hint-error");
    return;
  }

  el.setupHint.hidden = false;
  el.setupHint.textContent = formatSetupBlockerMessage(hintBlockers);
  el.setupHint.classList.add("setup-hint-error");
}

const SETUP_NAME_TEACH_FLASH_MS = 1400;

function playSetupNameTeachFlash(): void {
  el.heroNameInput.classList.remove("setup-name-teach-flash");
  void el.heroNameInput.offsetWidth;
  el.heroNameInput.classList.add("setup-name-teach-flash");
  window.setTimeout(() => {
    el.heroNameInput.classList.remove("setup-name-teach-flash");
  }, SETUP_NAME_TEACH_FLASH_MS);
}

function showSetupBlockedHint(): void {
  setupHintForced = true;
  updateSetupStartButton();
  if (!readHeroNameFromSetup()) {
    playSetupNameTeachFlash();
    el.heroNameInput.focus();
  } else {
    el.heroPicker.focus();
  }
}

function getPlayerHypeBonus(): number {
  return clampHype(hypeLevel) * HYPE_ATTACK_PER_LEVEL;
}

function getFoeHypeBonus(): number {
  return clampHype(foeHypeLevel) * HYPE_ATTACK_PER_LEVEL;
}

function getEffectiveAttack(): number {
  return player.attack + getPlayerHypeBonus();
}

function getEffectiveFoeAttack(): number {
  if (!foe) return 0;
  return foe.attack + getFoeHypeBonus();
}

function applyPlayerDanceBuff(amount = 1): void {
  gainPlayerHype(amount);
}

function applyFoeDanceBuff(amount = 1): void {
  gainFoeHype(amount);
}

function formatHypeAriaLabel(level: number): string {
  const clamped = clampHype(level);
  return `HYPE ${clamped} of ${HYPE_MAX}`;
}

function clearAllHype(): void {
  hypeLevel = 0;
  foeHypeLevel = 0;
  displayedPlayerHype = 0;
  displayedFoeHype = 0;
}

function syncHypeMaxPresentation(
  wrap: HTMLElement,
  level: number,
  side: "player" | "foe"
): void {
  const previous = side === "player" ? displayedPlayerHype : displayedFoeHype;
  const pres = hypeMaxPresentation(previous, level);
  wrap.classList.toggle("hype-maxed", pres.atMax);
  if (pres.flashReachedMax && !suppressTeachFlashesThisRender) {
    wrap.classList.remove("hype-maxed-flash");
    void wrap.offsetWidth;
    wrap.classList.add("hype-maxed-flash");
    window.setTimeout(() => wrap.classList.remove("hype-maxed-flash"), HYPE_METER_FLASH_MS);
  }
  const clamped = clampHype(level);
  if (side === "player") {
    displayedPlayerHype = clamped;
  } else {
    displayedFoeHype = clamped;
  }
}

function applyPlayerHitHypeLoss(damageDealt: number): void {
  hypeLevel = hypeAfterTakingHit(hypeLevel, damageDealt);
}

function applyFoeHitHypeLoss(damageDealt: number): void {
  foeHypeLevel = hypeAfterTakingHit(foeHypeLevel, damageDealt);
}

function renderHypeMeter(
  wrap: HTMLElement,
  statusPanel: HTMLElement,
  bar: HTMLElement,
  fill: HTMLElement,
  label: HTMLElement,
  level: number,
  side: "player" | "foe"
): void {
  const clamped = clampHype(level);
  label.textContent = formatHypeStatLabel(clamped);
  label.setAttribute("aria-label", formatHypeAriaLabel(clamped));
  setHpBar(fill, clamped, HYPE_MAX);
  bar.setAttribute("aria-valuenow", String(clamped));
  bar.setAttribute("aria-valuemax", String(HYPE_MAX));
  statusPanel.classList.toggle("hype-full", clamped >= HYPE_MAX);
  syncHypeMaxPresentation(wrap, level, side);
}

function foeDisplayName(): string {
  return foe?.name ?? "foe";
}

function formatFoeInText(template: string): string {
  return formatFoeMessage(template, foeDisplayName());
}

function renderRecords(): void {
  const save = loadSave();
  el.bestWave.textContent = String(save.bestWave);
  el.runs.textContent = String(save.runsPlayed);
}

function setHpBar(fill: HTMLElement, current: number, max: number): void {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  fill.style.width = `${pct}%`;
}

function canBeDefeatedByNextHit(hp: number, incomingAttack: number): boolean {
  return hp > 0 && incomingAttack >= hp;
}

function playXpBarFullBeat(): Promise<void> {
  const { max } = xpProgressForWave(wave);
  setHpBar(el.xpFill, max, max);
  el.xpText.textContent = "100%";
  el.xpBar.setAttribute("aria-valuenow", String(max));
  el.xpBar.setAttribute("aria-valuemax", String(max));
  return pause(XP_FILL_BEAT_MS);
}

function playFirstHypeFlash(wrap: HTMLElement): void {
  wrap.classList.add("hype-first-dance-flash");
  window.setTimeout(() => {
    wrap.classList.remove("hype-first-dance-flash");
  }, HYPE_METER_FLASH_MS);
}

function gainPlayerHype(amount: number): void {
  if (amount <= 0) {
    return;
  }
  hypeLevel = applyHypeGain(hypeLevel, amount);
}

function gainFoeHype(amount: number): void {
  if (amount <= 0) {
    return;
  }
  foeHypeLevel = applyHypeGain(foeHypeLevel, amount);
}

function syncFirstHypeFlashes(): void {
  if (suppressTeachFlashesThisRender) {
    return;
  }

  const skipPlayer = skipPlayerHypeTeachThisRender;
  skipPlayerHypeTeachThisRender = false;

  if (!skipPlayer) {
    const player = tryCelebrateFirstPlayerHype(combatHints, hypeLevel);
    combatHints = player.flags;
    if (player.flashFirstHype) {
      playFirstHypeFlash(el.playerHypeWrap);
    }
  }

  const foe = tryCelebrateFirstFoeHype(combatHints, foeHypeLevel);
  combatHints = foe.flags;
  if (foe.flashFirstHype) {
    playFirstHypeFlash(el.foeHypeWrap);
  }
}

const HP_TEACH_FLASH_MS = 1400;

function playHpBarTeachFlash(fill: HTMLElement, className: string): void {
  const bar = fill.parentElement;
  if (!bar) {
    return;
  }
  bar.classList.remove(className);
  void bar.offsetWidth;
  bar.classList.add(className);
  window.setTimeout(() => bar.classList.remove(className), HP_TEACH_FLASH_MS);
}

function playFirstHealHpFlash(): void {
  playHpBarTeachFlash(el.playerHpFill, "hp-first-heal-flash");
}

function playFirstPlayerDamageHpFlash(): void {
  playHpBarTeachFlash(el.playerHpFill, "hp-first-damage-flash");
}

function playFirstAttackFoeHpFlash(): void {
  playHpBarTeachFlash(el.foeHpFill, "hp-first-attack-flash");
}

function playFirstWaveVictoryHealHpFlash(): void {
  playHpBarTeachFlash(el.playerHpFill, "hp-first-wave-heal-flash");
}

function syncCombatHintClasses(): void {
  if (!el.healBtn || !el.danceBtn || !el.attackBtn || !el.runBtn) {
    return;
  }
  const hasFoe = foe !== null;
  const showAttack = shouldShowAttackHint(combatHints, phase, hasFoe);
  const showHeal = shouldShowHealHint(
    combatHints,
    player.hp,
    player.maxHp,
    phase,
    hasFoe,
    foe?.attack ?? 0,
    foeHypeLevel
  );
  const showRun =
    foe !== null &&
    shouldShowRunHint(
      combatHints,
      player.hp,
      foe.attack,
      foeHypeLevel,
      phase,
      hasFoe
    );
  const showDance = shouldShowDanceHint(
    combatHints,
    player.hp,
    player.maxHp,
    phase,
    hasFoe,
    hypeLevel,
    foe?.attack ?? 0,
    foeHypeLevel
  );
  el.attackBtn.classList.toggle("cmd-hint-flash", showAttack);
  el.healBtn.classList.toggle("cmd-hint-flash", showHeal);
  el.danceBtn.classList.toggle("cmd-hint-flash", showDance);
  el.runBtn.classList.toggle("cmd-hint-flash", showRun);
  el.attackBtn.dataset.combatHint = showAttack ? "on" : "off";
  el.healBtn.dataset.combatHint = showHeal ? "on" : "off";
  el.danceBtn.dataset.combatHint = showDance ? "on" : "off";
  el.runBtn.dataset.combatHint = showRun ? "on" : "off";
  syncCombatTeachPopups(showHeal, showDance, showRun);
}

function clearFooterTeachPopupPosition(popup: HTMLElement): void {
  popup.style.left = "";
  popup.style.top = "";
  popup.style.right = "";
  popup.style.bottom = "";
  popup.style.transform = "";
  popup.style.maxWidth = "";
  popup.style.removeProperty("--teach-arrow-offset");
  popup.style.removeProperty("--teach-arrow-offset-end");
}

function teachPopupGapPx(): number {
  const raw = getComputedStyle(el.gameShell).getPropertyValue("--space-2").trim();
  if (raw.endsWith("rem")) {
    const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize);
    return parseFloat(raw) * rootPx;
  }
  return parseFloat(raw) || 0;
}

function teachPopupArrowPx(): number {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--cmd-teach-arrow-size")
    .trim();
  return parseFloat(raw) || 7;
}

const MOBILE_TEACH_LAYOUT_MQ = window.matchMedia("(max-width: 768px)");

function teachPopupMaxWidthForLayout(): string | null {
  if (!MOBILE_TEACH_LAYOUT_MQ.matches) {
    return null;
  }
  return `${window.innerWidth * 0.8}px`;
}

function positionFooterTeachPopup(popup: HTMLElement, btn: HTMLElement): void {
  const shell = el.gameShell.getBoundingClientRect();
  const btnRect = btn.getBoundingClientRect();
  const gap = teachPopupGapPx();
  const arrow = teachPopupArrowPx();
  const margin = 8;

  popup.style.position = "fixed";
  popup.style.inset = "auto";
  popup.style.right = "auto";
  popup.style.bottom = "auto";
  popup.style.transform = "none";
  popup.style.margin = "0";

  const layoutMaxWidth = teachPopupMaxWidthForLayout();
  if (layoutMaxWidth) {
    popup.style.maxWidth = layoutMaxWidth;
  } else {
    popup.style.maxWidth = "";
  }

  const width = popup.offsetWidth;
  let left: number;
  if (popup.classList.contains("cmd-teach-popup--align-end")) {
    left = btnRect.right - width;
  } else {
    left = btnRect.left;
  }
  left = Math.max(shell.left + margin, Math.min(left, shell.right - width - margin));

  popup.style.left = `${left}px`;
  popup.style.top = `${btnRect.bottom + gap}px`;

  void popup.offsetHeight;
  const popupRect = popup.getBoundingClientRect();
  const arrowTipY = popupRect.top - arrow;
  const nudge = btnRect.bottom - arrowTipY;
  if (Math.abs(nudge) > 0.5) {
    popup.style.top = `${popupRect.top + nudge}px`;
  }

  const viewportMargin = 8;
  const viewportTop = viewportMargin;
  const viewportBottom = window.innerHeight - popup.offsetHeight - viewportMargin;
  const currentTop = parseFloat(popup.style.top || "0");
  popup.style.top = `${Math.min(Math.max(currentTop, viewportTop), viewportBottom)}px`;

  const placed = popup.getBoundingClientRect();
  const btnCenterX = btnRect.left + btnRect.width / 2;
  if (popup.classList.contains("cmd-teach-popup--align-end")) {
    popup.style.setProperty(
      "--teach-arrow-offset-end",
      `${Math.max(0, placed.right - btnCenterX)}px`
    );
    popup.style.removeProperty("--teach-arrow-offset");
  } else {
    popup.style.setProperty(
      "--teach-arrow-offset",
      `${Math.max(0, btnCenterX - placed.left)}px`
    );
    popup.style.removeProperty("--teach-arrow-offset-end");
  }
}

function syncCmdTeachPopup(
  popup: HTMLElement,
  btn: HTMLElement,
  popupId: string,
  show: boolean
): void {
  popup.classList.toggle("hidden", !show);
  if (show) {
    btn.setAttribute("aria-describedby", popupId);
    if (popup.classList.contains("cmd-teach-popup--dock-footer")) {
      requestAnimationFrame(() => {
        positionFooterTeachPopup(popup, btn);
        requestAnimationFrame(() => positionFooterTeachPopup(popup, btn));
      });
    }
  } else {
    btn.removeAttribute("aria-describedby");
    if (popup.classList.contains("cmd-teach-popup--dock-footer")) {
      clearFooterTeachPopupPosition(popup);
    }
  }
}

function syncVisibleFooterTeachPopups(): void {
  if (!el.danceTeachPopup.classList.contains("hidden")) {
    positionFooterTeachPopup(el.danceTeachPopup, el.danceBtn);
  }
  if (!el.runTeachPopup.classList.contains("hidden")) {
    positionFooterTeachPopup(el.runTeachPopup, el.runBtn);
  }
}

let footerTeachPopupResizeBound = false;

function bindFooterTeachPopupResize(): void {
  if (footerTeachPopupResizeBound) {
    return;
  }
  footerTeachPopupResizeBound = true;
  window.addEventListener("resize", syncVisibleFooterTeachPopups);
  el.gameShell.addEventListener("scroll", syncVisibleFooterTeachPopups);
}

function syncCombatTeachPopups(
  showHeal: boolean,
  showDance: boolean,
  showRun: boolean
): void {
  const hasFoe = foe !== null;
  syncCmdTeachPopup(
    el.healTeachPopup,
    el.healBtn,
    "cmd-heal-teach",
    shouldShowHealTeachCopy(combatHints, showHeal, phase, hasFoe)
  );
  syncCmdTeachPopup(
    el.danceTeachPopup,
    el.danceBtn,
    "cmd-dance-teach",
    shouldShowDanceTeachCopy(combatHints, showDance, phase, hasFoe)
  );
  syncCmdTeachPopup(
    el.runTeachPopup,
    el.runBtn,
    "cmd-run-teach",
    shouldShowRunTeachCopy(combatHints, showRun, phase, hasFoe)
  );
}

function briefClass(element: HTMLElement, className: string, ms: number): void {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
  window.setTimeout(() => element.classList.remove(className), ms);
}

function playStageClass(className: string, ms: number): Promise<void> {
  return new Promise((resolve) => {
    el.battleStage.classList.remove(className);
    void el.battleStage.offsetWidth;
    el.battleStage.classList.add(className);
    window.setTimeout(() => {
      el.battleStage.classList.remove(className);
      resolve();
    }, ms);
  });
}

function clearCombatAnimations(): void {
  el.playerPanel.classList.remove(
    "hero-death",
    "hero-death-knockback",
    "hero-victory-wobble",
    "hero-heal",
    "hero-dance"
  );
  el.foePanel.classList.remove(
    "foe-poof",
    "foe-enter",
    "foe-dance",
    "foe-sprite-hidden"
  );
  clearHitReact(el.playerPanel);
  clearHitReact(el.foePanel);
  el.battleStage.classList.remove("stage-death-vignette", "stage-flash-gold");
}

function clearHitReact(panel: HTMLElement): void {
  panel
    .querySelector(".emoji-stack")
    ?.classList.remove(
      "hero-took-hit",
      "hero-took-hit-fatal",
      "foe-took-hit",
      "foe-took-hit-fatal",
      "hero-lunge",
      "foe-lunge"
    );
  panel
    .querySelector(".hit-mark")
    ?.classList.remove("hit-mark-active", "hit-mark-active-kill");
}

function playHeroHeal(): Promise<void> {
  return new Promise((resolve) => {
    el.playerPanel.classList.remove("hero-heal");
    void el.playerPanel.offsetWidth;
    el.playerPanel.classList.add("hero-heal");
    window.setTimeout(() => {
      el.playerPanel.classList.remove("hero-heal");
      resolve();
    }, HEAL_ANIM_MS);
  });
}

function playHeroDance(): void {
  briefClass(el.playerPanel, "hero-dance", DANCE_ANIM_MS);
}

function playFoeDance(): void {
  briefClass(el.foePanel, "foe-dance", DANCE_ANIM_MS);
}

async function playRunExit(): Promise<void> {
  await playFoePoof();
}

function playRunEntrance(): void {
  playFoeEntrance();
}

function playFoeEntrance(): void {
  el.foePanel.classList.remove("foe-sprite-hidden");
  briefClass(el.foePanel, "foe-enter", FOE_ENTRANCE_MS);
}

function playFoePoof(): Promise<void> {
  return new Promise((resolve) => {
    el.foePanel.classList.remove("foe-poof", "foe-sprite-hidden");
    void el.foePanel.offsetWidth;
    el.foePanel.classList.add("foe-poof");
    window.setTimeout(() => {
      el.foePanel.classList.remove("foe-poof");
      el.foePanel.classList.add("foe-sprite-hidden");
      resolve();
    }, FOE_POOF_MS);
  });
}

async function playFoeDefeat(isFinal: boolean): Promise<void> {
  if (isFinal) {
    await Promise.all([playFoePoof(), playStageClass("stage-flash-gold", GOLD_FLASH_MS)]);
    briefClass(el.playerPanel, "hero-victory-wobble", 450);
    await pause(350);
    return;
  }
  await playFoePoof();
}

async function handlePlayerDeath(): Promise<void> {
  await pause(420);
  el.playerPanel.classList.add("hero-death");
  await playStageClass("stage-death-vignette", DEATH_BEAT_MS);
  endGame();
}

function spritePopAnchor(side: "hero" | "foe"): { left: string; top: string } {
  const panel = side === "hero" ? el.playerPanel : el.foePanel;
  const stack = panel.querySelector<HTMLElement>(".sprite-wrap .emoji-stack");
  const layerRect = el.damageLayer.getBoundingClientRect();
  if (!stack || layerRect.width <= 0 || layerRect.height <= 0) {
    const fallbackLeft = side === "hero" ? 22 : 78;
    return { left: `${fallbackLeft}%`, top: "42%" };
  }
  const stackRect = stack.getBoundingClientRect();
  const centerX =
    ((stackRect.left + stackRect.width / 2 - layerRect.left) / layerRect.width) *
    100;
  const gapAbove = Math.max(32, stackRect.height * 0.78);
  const anchorY =
    ((stackRect.top - gapAbove - layerRect.top) / layerRect.height) * 100;
  return { left: `${centerX}%`, top: `${anchorY}%` };
}

function showDamagePop(
  side: "hero" | "foe",
  text: string,
  kind: "damage" | "heal" | "hype",
  anchorOverride?: { left: string; top: string }
): void {
  const pop = document.createElement("span");
  pop.className =
    kind === "heal"
      ? "damage-pop heal-pop"
      : kind === "hype"
        ? "damage-pop hype-pop"
        : "damage-pop";
  pop.textContent = text;
  const anchor = anchorOverride ?? spritePopAnchor(side);
  pop.style.left = anchor.left;
  pop.style.top = anchor.top;
  el.damageLayer.appendChild(pop);
  void pop.offsetWidth;
  window.setTimeout(() => pop.remove(), 900);
}

const LEVEL_UP_NOTICE_MS = 1800;

function playLevelUpNotice(level: number): Promise<void> {
  return new Promise((resolve) => {
    const pop = document.createElement("span");
    pop.className = "level-up-pop";
    pop.textContent = `Level ${level}`;
    pop.setAttribute("role", "status");
    el.heroLevelUpLayer.setAttribute("aria-hidden", "false");
    el.heroLevelUpLayer.appendChild(pop);
    void pop.offsetWidth;
    window.setTimeout(() => {
      pop.remove();
      el.heroLevelUpLayer.setAttribute("aria-hidden", "true");
      resolve();
    }, LEVEL_UP_NOTICE_MS);
  });
}

function renderHeroSprite(): void {
  el.playerEmoji.textContent = player.emoji;
  el.playerEmoji.setAttribute("aria-label", player.name);
  el.playerName.textContent = player.name.toUpperCase();
}

function render(): void {
  renderRecords();
  applyHeroColorTheme(heroColorTheme);
  renderHeroSprite();
  el.waveBanner.textContent = `Wave ${Math.min(wave, getCampaignLength())} / ${getCampaignLength()}`;
  const inEndScreen = phase === "gameover" || phase === "victory";
  el.turnLabel.textContent = inEndScreen ? "-" : String(turn);
  const xp = xpProgressForDisplay(wave, phase);
  setHpBar(el.xpFill, xp.current, xp.max);
  el.xpText.textContent = `${xpPercentForDisplay(wave, phase)}%`;
  el.xpBar.setAttribute("aria-valuenow", String(xp.current));
  el.xpBar.setAttribute("aria-valuemax", String(xp.max));

  setHpBar(el.playerHpFill, player.hp, player.maxHp);
  el.playerHpText.textContent = `${player.hp}/${player.maxHp}`;
  el.playerLevel.textContent = String(playerLevelForWave(wave));
  el.playerAttack.textContent = String(getEffectiveAttack());
  renderHypeMeter(
    el.playerHypeWrap,
    el.playerStatus,
    el.playerHypeBar,
    el.playerHypeFill,
    el.playerBuff,
    hypeLevel,
    "player"
  );

  const playerHpBar = el.playerPanel.querySelector(".hp-bar");
  playerHpBar?.classList.toggle(
    "hp-low",
    canBeDefeatedByNextHit(player.hp, getEffectiveFoeAttack())
  );

  if (foe && !suppressFoePanelRender) {
    applyFoeColorTheme(foeColorTheme);
    el.foeName.textContent = foe.name.toUpperCase();
    el.foeLevel.textContent = String(foe.level);
    el.foeAttack.textContent = String(getEffectiveFoeAttack());
    renderHypeMeter(
      el.foeHypeWrap,
      el.foeStatus,
      el.foeHypeBar,
      el.foeHypeFill,
      el.foeBuff,
      foeHypeLevel,
      "foe"
    );
    el.foeEmoji.textContent = foe.emoji;
    el.foeEmoji.setAttribute("aria-label", foe.name);
    setHpBar(el.foeHpFill, foe.hp, foe.maxHp);
    el.foeHpText.textContent = `${foe.hp}/${foe.maxHp}`;
    const foeHpBar = el.foePanel.querySelector(".hp-bar");
    foeHpBar?.classList.toggle(
      "hp-low",
      canBeDefeatedByNextHit(foe.hp, getEffectiveAttack())
    );
  } else {
    el.foeStatus.classList.remove("hype-full");
  }

  if (phase !== "victory") {
    stopVictoryCelebration(el.victoryEmojiLayer);
  }
  el.gameOver.classList.toggle("hidden", !inEndScreen);
  el.gameOver.classList.toggle("game-victory", phase === "victory");
  el.gameOverTag.textContent = phase === "victory" ? "YOU WIN!" : "GAME OVER";
  el.restartLabel.textContent = phase === "victory" ? "Play Again?" : "Try Again?";
  renderGameOverBattleLog();
  el.actions.classList.toggle("hidden", inEndScreen);
  syncFirstHypeFlashes();
  syncCombatHintClasses();
  suppressTeachFlashesThisRender = false;
}

type BattleActionLabel = "Attack" | "Heal" | "Dance" | "Run";

function rememberBattleLogEntry(
  lines: { text: string; kind: "info" | "player" | "foe" | "win" | "lose" }[],
  action?: BattleActionLabel,
  title?: string,
  turnOverride = turn
): void {
  battleLogHistory.push({
    title,
    waveTitle:
      title && title.startsWith("WAVE ")
        ? { wave, attempt: waveAttempt }
        : undefined,
    wave,
    turn: turnOverride,
    action,
    playerAttack: getEffectiveAttack(),
    playerPower: hypeLevel,
    foeAttack: foe ? getEffectiveFoeAttack() : null,
    foePower: foe ? foeHypeLevel : null,
    foeColorTheme,
    lines: lines.map((line) => ({ ...line })),
  });
}

function resetBattleLogHistory(): void {
  battleLogHistory.length = 0;
}

function renderGameOverBattleLog(): void {
  const waveAttemptCounts = new Map<number, number>();
  for (const entry of battleLogHistory) {
    if (!entry.waveTitle) continue;
    waveAttemptCounts.set(
      entry.waveTitle.wave,
      Math.max(waveAttemptCounts.get(entry.waveTitle.wave) ?? 0, entry.waveTitle.attempt)
    );
  }
  el.gameOverBattleLog.replaceChildren();
  for (const entry of battleLogHistory) {
    const item = document.createElement("li");
    item.className = entry.title
      ? "game-over-log-entry game-over-log-entry-title"
      : "game-over-log-entry";
    const colors = colorThemeSurfaces(getColorTheme(entry.foeColorTheme), currentColorMode);
    item.style.setProperty(
      "--entry-foe-text",
      currentColorMode === "dark" ? colors.accent : colors.plateText
    );
    if (entry.title) {
      const meta = document.createElement("div");
      meta.className = "game-over-log-meta";
      if (entry.waveTitle && (waveAttemptCounts.get(entry.waveTitle.wave) ?? 1) > 1) {
        meta.textContent = `WAVE ${entry.waveTitle.wave}.${entry.waveTitle.attempt}`;
      } else {
        meta.textContent = entry.title;
      }
      item.appendChild(meta);
      for (const line of entry.lines) {
        appendBattleLine(item, line.text, line.kind);
      }
      el.gameOverBattleLog.appendChild(item);
      continue;
    }
    if (entry.action) {
      const meta = document.createElement("div");
      meta.className = "game-over-log-meta";
      meta.textContent = `Turn ${entry.turn} - ${entry.action}`;
      item.appendChild(meta);
    }
    for (const line of entry.lines) {
      appendBattleLine(item, line.text, line.kind);
    }
    el.gameOverBattleLog.appendChild(item);
  }
}

function logLine(
  text: string,
  kind: "info" | "player" | "foe" | "win" | "lose" = "info",
  action?: BattleActionLabel,
  turnOverride = turn,
  historyText = text
): void {
  rememberBattleLogEntry([{ text: historyText, kind }], action, undefined, turnOverride);
  el.battleText.textContent = text;
  el.battleText.className = `battle-text battle-${kind}`;
  revealBattleLog();
}

function logWaveStart(): void {
  if (!foe) return;
  const title = `WAVE ${wave}`;
  const lines: BattleLogEntry["lines"] = [];
  if ((wave - 1) % WAVES_PER_LEVEL === 0) {
    lines.push({
      text: `LEVEL ${playerLevelForWave(wave)}: ${player.maxHp} HP · ATK ${getEffectiveAttack()}`,
      kind: "player",
    });
  }
  lines.push({
    text: `${foe.name} · ATK ${getEffectiveFoeAttack()} · HP ${foe.maxHp}`,
    kind: "foe",
  });
  rememberBattleLogEntry(
    lines,
    undefined,
    title
  );
}

function logEndTitle(text: string): void {
  rememberBattleLogEntry([], undefined, text);
}

function levelUpStatsText(): string {
  return `LEVEL UP · ATK ${getEffectiveAttack()} · HP ${player.maxHp}`;
}

function logBattleLines(
  primary: { text: string; kind: "info" | "player" | "foe" | "win" | "lose" },
  secondary: { text: string; kind: "info" | "player" | "foe" | "win" | "lose" },
  action?: BattleActionLabel,
  turnOverride = turn
): void {
  rememberBattleLogEntry([primary, secondary], action, undefined, turnOverride);
  setBattleLines(el.battleText, [primary, secondary]);
  revealBattleLog();
}

function appendDanceHypeSuffix(line: string, suffix: string): string {
  return suffix ? `${line} ${suffix}` : line;
}

function danceHypeSuffix(gain: number, capped: boolean): string {
  if (gain > 0) {
    return `+${gain} HYPE`;
  }
  if (capped) {
    return "MAX HYPE";
  }
  return "";
}

function logDanceLines(
  opener: string,
  reaction: string,
  opts: {
    playerGain: number;
    foeGain: number;
    playerCapped: boolean;
    foeCapped: boolean;
    turnOverride?: number;
  }
): void {
  const lines: { text: string; kind: "info" | "player" | "foe" | "win" | "lose" }[] = [
    {
      text: appendDanceHypeSuffix(opener, danceHypeSuffix(opts.playerGain, opts.playerCapped)),
      kind: "player",
    },
    {
      text: appendDanceHypeSuffix(reaction, danceHypeSuffix(opts.foeGain, opts.foeCapped)),
      kind: "foe",
    },
  ];
  rememberBattleLogEntry(lines, "Dance", undefined, opts.turnOverride ?? turn);
  setBattleLines(el.battleText, lines);
  revealBattleLog();
}

function revealBattleLog(): void {
  el.battleText.closest(".dialog-box")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function combatGateState(): CombatGateState {
  return {
    phase,
    combatBusy,
    awaitingFoeResponse,
    combatActionGeneration,
    playerHp: player.hp,
    hasFoe: foe !== null,
  };
}

function applyCombatGateState(state: CombatGateState): void {
  combatBusy = state.combatBusy;
  awaitingFoeResponse = state.awaitingFoeResponse;
  combatActionGeneration = state.combatActionGeneration;
}

function canUseCombatActions(): boolean {
  return canUseCombatActionsGate(combatGateState());
}

/** Returns action generation id when locked; null if actions are not allowed. */
function lockCombat(): number | null {
  const locked = tryLockCombatGate(combatGateState());
  if (!locked.ok) {
    return null;
  }
  applyCombatGateState(locked.state);
  return locked.generation;
}

function finishCombatAction(generation: number): void {
  applyCombatGateState(finishCombatActionGate(generation, combatGateState()));
  syncCombatHintClasses();
}

function playNextFoeReveal(
  primary: { text: string; kind: "player" },
  secondary: { text: string; kind: "foe" }
): void {
  applyFoeColorTheme(foeColorTheme);
  setBattleLines(el.battleText, [primary, secondary]);
  revealBattleLog();
  render();
  playFoeEntrance();
}

async function transitionToNextWave(
  previousFoeName: string,
  transition: "flee" | "defeat",
  entrance: "run" | "foe" = "foe",
  exitAnimPromise?: Promise<void>,
  knownDefeatVerb?: string,
  knownDefeatText?: string
): Promise<void> {
  const defeatVerb =
    transition === "defeat" ? (knownDefeatVerb ?? nextDefeatVerb()) : undefined;
  const fleeWithExitAnim = exitAnimPromise !== undefined;
  const fledId = foe?.id;

  if (fleeWithExitAnim) {
    logLine(
      `You run away from ${previousFoeName},`,
      "player",
      "Run",
      turn,
      `You run away from ${previousFoeName}.`
    );
  } else if (!(transition === "defeat" && knownDefeatVerb)) {
    const actionText =
      transition === "flee"
        ? `You run away from ${previousFoeName},`
        : `You ${defeatVerb} ${previousFoeName},`;

    logLine(
      actionText,
      "player",
      transition === "flee" ? "Run" : "Attack",
      turn,
      transition === "flee" ? `You run away from ${previousFoeName}.` : actionText
    );
  }

  turn = 1;
  pickNextFoeColor();
  let flashWaveVictoryHealHp = false;

  if (transition === "defeat") {
    const completedWave = wave;
    const isLevelBandFinaleWave = isLevelBandFinale(
      completedWave,
      getCampaignLength()
    );
    if (isLevelBandFinaleWave) {
      await playXpBarFullBeat();
    }

    wave += 1;
    waveAttempt = 1;
    const levelBefore = playerLevelForWave(wave - 1);
    const hpBeforeHeal = player.hp;
    const maxHpBeforeHeal = player.maxHp;
    const advanced = advanceFoeQueueAfterVictory(
      foeQueue,
      deferredFoeIds,
      foeOrder,
      wave
    );
    foeQueue = advanced.queue;
    deferredFoeIds = advanced.deferred;

    const playerLevel = syncPlayerForCurrentWave({
      grantMaxHpIncrease: true,
      healToMax: playerLevelForWave(wave) > levelBefore,
    });

    if (playerLevel <= levelBefore) {
      applyWaveVictoryHeal();
    }

    const waveHealFlash = tryCelebrateFirstWaveVictoryHeal(
      combatHints,
      completedWave,
      hpBeforeHeal,
      player.hp
    );
    combatHints = waveHealFlash.flags;
    flashWaveVictoryHealHp = waveHealFlash.flashHp;
    combatHints = onVictoryForHints(combatHints);
    foe = spawnFoeFromQueue();
    combatHints = onNextFoeForHints(combatHints, {
      hypeLevel,
      hp: player.hp,
      maxHp: player.maxHp,
      wave,
      viaKill: true,
    });
    foeHypeLevel = 0;
    persist();

    if (playerLevel > levelBefore) {
      render();
      void playLevelUpNotice(playerLevel);
    }
  } else if (fledId) {
    waveAttempt += 1;
    const advanced = advanceFoeQueueAfterFlee(
      foeQueue,
      deferredFoeIds,
      fledId,
      foeOrder,
      wave
    );
    foeQueue = advanced.queue;
    deferredFoeIds = advanced.deferred;
    foe = spawnFoeFromQueue();
    combatHints = onNextFoeForHints(combatHints, {
      hypeLevel,
      hp: player.hp,
      maxHp: player.maxHp,
      wave,
      viaKill: false,
    });
    foeHypeLevel = 0;
    persist();
  }

  logWaveStart();

  if (fleeWithExitAnim) {
    suppressFoePanelRender = true;
    render();
    await exitAnimPromise;
    suppressFoePanelRender = false;
    playNextFoeReveal(
      { text: `You run away from ${previousFoeName},`, kind: "player" },
      { text: `but you run into ${foe!.name}!`, kind: "foe" }
    );
  } else {
    playNextFoeReveal(
      { text: knownDefeatText ?? `You ${defeatVerb} ${previousFoeName},`, kind: "player" },
      { text: `but ${foe!.name} appears!`, kind: "foe" }
    );
  }

  if (flashWaveVictoryHealHp) {
    playFirstWaveVictoryHealHpFlash();
  }

  persist();
}

function clearLog(): void {
  resetBattleLogHistory();
  el.battleText.textContent = "What will you do?";
  el.battleText.className = "battle-text battle-info";
}

function rollDamage(max: number): number {
  return randomDamage(max, Math.random);
}

function rollAndApplyPlayerHeal(): {
  rolled: number;
  gained: number;
  hpBefore: number;
} {
  const hpBefore = player.hp;
  const result = applyPlayerHealRoll(
    hpBefore,
    player.maxHp,
    getHealMax(),
    Math.random
  );
  player.hp = result.hp;
  return { rolled: result.rolled, gained: result.gained, hpBefore };
}

function showPlayerHealRoll(rolled: number): void {
  showDamagePop("hero", `+${rolled}`, "heal");
  void playHeroHeal();
}

function nextDefeatVerb(): string {
  const result = advanceDefeatVerb(defeatVerbIndex, DEFEAT_VERBS);
  defeatVerbIndex = result.nextIndex;
  return result.verb;
}

function startWave(): void {
  waveAttempt = 1;
  syncPlayerForCurrentWave({ healToMax: wave === 1 });
  if (foeQueue.length === 0) {
    foeQueue = buildInitialFoeQueue(foeOrder);
    deferredFoeIds = [];
  }
  pickNextFoeColor();
  foe = spawnFoeFromQueue();
  foeHypeLevel = 0;
  combatHints = maybeArmDanceHintForWave(combatHints, wave);
  applyFoeColorTheme(foeColorTheme);
  logWaveStart();
  setBattleLines(el.battleText, [{ text: `${foe.name} appears!`, kind: "foe" }]);
  revealBattleLog();
  render();
  playFoeEntrance();
  persist();
}

function gameOverSummaryText(currentWave: number, isNewRecord = false): string {
  const completedWave = Math.max(0, currentWave - 1);
  const waveText = completedWave === 1 ? "1 wave" : `${completedWave} waves`;
  const summary = `You beat ${waveText}.`;
  return isNewRecord ? `NEW RECORD! ${summary}` : summary;
}

function updateRecordsOnGameOver(): boolean {
  const save = loadSave();
  const completedWave = Math.max(0, wave - 1);
  const isNewRecord = completedWave > save.bestWave;
  const bestWave = Math.max(save.bestWave, completedWave);
  const runsPlayed = save.runsPlayed + 1;

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      withSaveMeta({
        bestWave,
        runsPlayed,
        playerEmoji: player.emoji,
        heroName: player.name,
        heroColorTheme,
        setupActive: false,
        snapshot: getSnapshot(),
      })
    )
  );

  el.gameOverSummary.textContent = gameOverSummaryText(wave, isNewRecord);
  return isNewRecord;
}

function updateRecordsOnVictory(): void {
  const save = loadSave();
  const bestWave = Math.max(save.bestWave, getCampaignLength());
  const runsPlayed = save.runsPlayed + 1;

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      withSaveMeta({
        bestWave,
        runsPlayed,
        playerEmoji: player.emoji,
        heroName: player.name,
        heroColorTheme,
        setupActive: false,
        snapshot: getSnapshot(),
      })
    )
  );

  el.gameOverSummary.textContent = `All ${CAMPAIGN_WAVES} waves cleared. Critterwave legend.`;
}

function endGame(): void {
  stopVictoryCelebration(el.victoryEmojiLayer);
  applyCombatGateState(blockCombatForScreenEnd(combatGateState()));
  phase = "gameover";
  clearAllHype();
  logEndTitle("GAME OVER");
  updateRecordsOnGameOver();
  persist();
  render();
}

function winCampaign(): void {
  applyCombatGateState(blockCombatForScreenEnd(combatGateState()));
  phase = "victory";
  clearAllHype();
  logEndTitle(`Wave ${CAMPAIGN_WAVES} cleared! Total victory!`);
  updateRecordsOnVictory();
  startVictoryCelebration(
    el.victoryEmojiLayer,
    FOES.map((foe) => foe.emoji),
    player.emoji
  );
  persist();
  render();
}

function hasDebugWin(): boolean {
  return (
    isDebugHost(window.location.hostname) &&
    new URLSearchParams(window.location.search).get("debug") === "win"
  );
}

function triggerDebugWin(): void {
  hideSetup();

  if (!player.emoji) {
    const first = HEROES[0]!;
    applyHeroChoice(first.emoji, first.label);
    applyHeroColorTheme(resolveHeroColorTheme(loadSave()));
  }

  wave = getCampaignLength();
  clearLog();
  winCampaign();
}

function mountDebugHooks(): boolean {
  if (!isDebugHost(window.location.hostname)) {
    return false;
  }

  const debugMode = new URLSearchParams(window.location.search).get("debug");

  if (debugMode === "lose") {
    console.info("[critterwave] debug lose fired");
    hideSetup();

    if (!player.emoji) {
      const first = HEROES[0]!;
      applyHeroChoice(first.emoji, first.label);
      applyHeroColorTheme(resolveHeroColorTheme(loadSave()));
    }

    wave = 1;
    turn = 1;
    phase = "combat";
    foeOrder = buildFoeOrder(player.emoji);
    foeQueue = buildInitialFoeQueue(foeOrder);
    deferredFoeIds = [];
    startWave();

    player.hp = 0;
    endGame();

    return true;
  }

  if (debugMode === "win") {
    window.critterwave = { win: triggerDebugWin };
    console.info(
      "[critterwave] Debug: critterwave.win() — or load with ?debug=win"
    );
  }

  return false;
}

function maybeRunDebugWin(): void {
  if (!hasDebugWin()) {
    return;
  }

  triggerDebugWin();
}

async function winWave(defeatVerb: string, defeatText: string): Promise<void> {
  if (!foe) return;

  const defeatedFoe = foe.name;
  if (wave >= getCampaignLength()) {
    winCampaign();
    return;
  }

  await transitionToNextWave(defeatedFoe, "defeat", "foe", undefined, defeatVerb, defeatText);
}

function playHitExchange(
  attacker: "hero" | "foe",
  victim: "hero" | "foe",
  fatal = false
): void {
  const attackerPanel = attacker === "hero" ? el.playerPanel : el.foePanel;
  const victimPanel = victim === "hero" ? el.playerPanel : el.foePanel;
  const attackerStack = attackerPanel.querySelector<HTMLElement>(".emoji-stack");
  const victimStack = victimPanel.querySelector<HTMLElement>(".emoji-stack");
  const victimMark = victimPanel.querySelector<HTMLElement>(".hit-mark");
  if (!attackerStack || !victimStack || !victimMark) return;

  const ms = fatal ? 450 : 400;
  const lungeClass = attacker === "hero" ? "hero-lunge" : "foe-lunge";
  const hitClass =
    victim === "hero"
      ? fatal
        ? "hero-took-hit-fatal"
        : "hero-took-hit"
      : fatal
        ? "foe-took-hit-fatal"
        : "foe-took-hit";

  briefClass(attackerStack, lungeClass, ms);
  briefClass(victimStack, hitClass, ms);
  briefClass(victimMark, fatal ? "hit-mark-active-kill" : "hit-mark-active", ms);
}

function applyFoeCounterAttack(): number | null {
  if (!foe || foe.hp <= 0) return null;

  const hit = rollDamage(getEffectiveFoeAttack());
  player.hp = Math.max(0, player.hp - hit);
  if (hit > 0) {
    const damageHint = recordPlayerDamageForHints(combatHints);
    combatHints = damageHint.flags;
    if (damageHint.flashHp) {
      playFirstPlayerDamageHpFlash();
    }
    applyPlayerHitHypeLoss(hit);
  }

  if (player.hp > 0) {
    turn += 1;
  }

  return hit;
}

function playFoeCounterHitVisuals(hit: number, fatal: boolean): void {
  // Hero's hit react may still be on the foe stack; clear so foe-lunge doesn't fight foe-took-hit.
  clearHitReact(el.foePanel);
  clearHitReact(el.playerPanel);
  showDamagePop("hero", `-${hit}`, "damage");
  playHitExchange("foe", "hero", fatal);
}

function scheduleFoeCounterHitVisuals(hit: number, generation: number): void {
  const fatal = player.hp <= 0;
  window.setTimeout(() => {
    if (isFollowUpTimerStale(generation, combatGateState(), phase)) {
      finishCombatAction(generation);
      return;
    }
    playFoeCounterHitVisuals(hit, fatal);
    if (fatal) {
      void handlePlayerDeath().finally(() => finishCombatAction(generation));
      return;
    }
    finishCombatAction(generation);
  }, FOE_FOLLOW_UP_DELAY_MS);
}

function scheduleFoeDanceFollowUp(
  generation: number,
  opts: { foeDances: boolean; foeGain: number; foeCapped: boolean }
): void {
  const delay = foeFollowUpDelayMs(opts.foeDances);
  window.setTimeout(() => {
    if (isFollowUpTimerStale(generation, combatGateState(), phase)) {
      finishCombatAction(generation);
      return;
    }
    if (opts.foeDances) {
      playFoeDance();
    }
    if (opts.foeGain > 0) {
      showDamagePop("foe", "HYPE", "hype");
    }
    finishCombatAction(generation);
  }, delay);
}

function onAttack(): void {
  const generation = lockCombat();
  if (generation === null) return;
  const currentFoe = foe!;
  const actionTurn = turn;

  const firstAttack = !combatHints.dismissedAttackHint;
  combatHints = recordAttackForHints(combatHints);
  syncCombatHintClasses();
  if (firstAttack) {
    playFirstAttackFoeHpFlash();
  }

  const hit = rollDamage(getEffectiveAttack());
  currentFoe.hp = Math.max(0, currentFoe.hp - hit);
  if (hit > 0) {
    applyFoeHitHypeLoss(hit);
  }
  const foeKilled = currentFoe.hp <= 0;
  showDamagePop("foe", `-${hit}`, "damage");
  playHitExchange("hero", "foe", foeKilled);

  if (foeKilled) {
    const defeatVerb = nextDefeatVerb();
    const defeatText = `You ${defeatVerb} ${currentFoe.name} with ${hit} damage,`;
    logLine(
      defeatText,
      "player",
      "Attack",
      actionTurn,
      `You ${defeatVerb} ${currentFoe.name} with ${hit} damage.`
    );
    render();
    const isFinal = wave >= getCampaignLength();
    void playFoeDefeat(isFinal)
      .then(async () => {
        if (isFinal) {
          applyWaveVictoryHeal();
          await playXpBarFullBeat();
          winCampaign();
        } else {
          return winWave(defeatVerb, defeatText);
        }
      })
      .finally(() => finishCombatAction(generation));
    return;
  }

  applyCombatGateState(beginAwaitingFoeResponse(combatGateState()));
  const counterHit = applyFoeCounterAttack();
  syncCombatHintClasses();
  if (counterHit === null) {
    finishCombatAction(generation);
    return;
  }

  logBattleLines(
    { text: `You hit ${currentFoe.name} for ${hit} damage.`, kind: "player" },
    { text: `${currentFoe.name} hits you for ${counterHit} damage.`, kind: "foe" },
    "Attack",
    actionTurn
  );
  render();
  persist();
  scheduleFoeCounterHitVisuals(counterHit, generation);
}

function applyHealPop(gained: number): void {
  if (gained <= 0) {
    return;
  }
  showDamagePop("hero", `+${gained}`, "heal");
  render();
  void playHeroHeal();
}

function applyWaveVictoryHealPop(hpBefore: number): void {
  applyHealPop(player.hp - hpBefore);
}

function applyFleeHeal(): void {
  const { rolled, gained } = rollAndApplyPlayerHeal();
  showPlayerHealRoll(rolled);
  if (gained > 0) {
    render();
    persist();
  }
}

function applyWaveVictoryHeal(): void {
  const before = player.hp;
  player.hp = healHpAfterWaveVictory(before, player.maxHp);
  applyWaveVictoryHealPop(before);
}

function onHeal(): void {
  const generation = lockCombat();
  if (generation === null) return;
  const currentFoe = foe!;
  const actionTurn = turn;

  skipPlayerHypeTeachThisRender = true;

  const { rolled, gained } = rollAndApplyPlayerHeal();
  const firstMeaningfulHeal =
    !combatHints.dismissedHealHint && gained > 0;
  combatHints = recordHealForHints(combatHints, { armDance: gained > 0 });
  syncCombatHintClasses();
  if (firstMeaningfulHeal) {
    playFirstHealHpFlash();
  }
  showPlayerHealRoll(rolled);

  applyCombatGateState(beginAwaitingFoeResponse(combatGateState()));
  const counterHit = applyFoeCounterAttack();
  syncCombatHintClasses();
  if (counterHit === null) {
    render();
    persist();
    finishCombatAction(generation);
    return;
  }

  logBattleLines(
    { text: `You healed yourself for ${rolled} HP.`, kind: "player" },
    { text: `${currentFoe.name} hits you for ${counterHit} damage.`, kind: "foe" },
    "Heal",
    actionTurn
  );
  render();
  persist();
  scheduleFoeCounterHitVisuals(counterHit, generation);
}

function onDance(): void {
  const generation = lockCombat();
  if (generation === null) return;
  const currentFoe = foe!;
  const actionTurn = turn;

  const isFirstDance = !combatHints.celebratedFirstDance;
  combatHints = recordDanceForHints(combatHints);
  syncCombatHintClasses();

  const response = isFirstDance
    ? pickFirstDanceResponse()
    : pickRandomDanceResponse();
  const attemptedPlayerGain = getPlayerHypeGain(response);
  const attemptedFoeGain = getFoeHypeGain(response);
  const joins = response.foeJoins === true;

  const actualPlayerGain = Math.min(attemptedPlayerGain, hypeHeadroom(hypeLevel));
  const actualFoeGain = Math.min(attemptedFoeGain, hypeHeadroom(foeHypeLevel));
  const playerCapped =
    attemptedPlayerGain > 0 && actualPlayerGain < attemptedPlayerGain;
  const foeCapped = attemptedFoeGain > 0 && actualFoeGain < attemptedFoeGain;

  if (actualPlayerGain > 0) {
    applyPlayerDanceBuff(actualPlayerGain);
  }
  if (actualFoeGain > 0) {
    applyFoeDanceBuff(actualFoeGain);
  }

  const opener = pickRandomDanceOpener();
  const reaction = formatFoeInText(response.message);
  const tail = formatDanceHypeTail(actualPlayerGain, actualFoeGain, currentFoe.name, {
    playerCapped,
    foeCapped,
  });

  playHeroDance();
  logDanceLines(opener, reaction, {
    playerGain: actualPlayerGain,
    foeGain: actualFoeGain,
    playerCapped,
    foeCapped,
    turnOverride: actionTurn,
  });

  const foeDances = joins || attemptedFoeGain > 0;
  if (tail) {
    if (actualPlayerGain > 0) {
      showDamagePop("hero", "HYPE", "hype");
    }
  }

  turn += 1;
  render();
  persist();
  scheduleFoeDanceFollowUp(generation, {
    foeDances,
    foeGain: actualFoeGain,
    foeCapped,
  });
}

function onRun(): void {
  const generation = lockCombat();
  if (generation === null) return;
  const currentFoe = foe!;

  if (wave >= getCampaignLength()) {
    logLine("No fleeing the final foe!", "info", "Run");
    finishCombatAction(generation);
    return;
  }

  combatHints = deferDanceHintAfterRun(combatHints);
  combatHints = recordRunForHints(combatHints);
  syncCombatHintClasses();

  clearAllHype();
  applyFleeHeal();
  const fledFoe = currentFoe.name;
  const exitAnimPromise = playRunExit();
  void transitionToNextWave(fledFoe, "flee", "run", exitAnimPromise).finally(() =>
    finishCombatAction(generation)
  );
}

function applyHeroChoice(emoji: string, label: string): void {
  player.emoji = emoji;
  player.name = label;
  pendingHeroEmoji = emoji;
  pendingHeroLabel = label;
}

function resolvePickerHeroEmoji(emoji: string): string {
  return resolveHeroPickerEmoji(emoji, HERO_PICKER_ORDER, isMobileHeroPickerViewport());
}

function buildHeroPicker(): void {
  el.heroPicker.replaceChildren();

  const grid = document.createElement("div");
  grid.className = "emoji-picker-grid";
  const mobile = isMobileHeroPickerViewport();

  for (const hero of HEROES) {
    if (isHeroEmojiHiddenInPicker(hero.emoji, mobile)) {
      continue;
    }
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "emoji-pick";
    btn.dataset.emoji = hero.emoji;
    btn.dataset.label = hero.label;
    btn.setAttribute("aria-label", hero.label);
    const glyph = document.createElement("span");
    glyph.className = "emoji-pick-glyph";
    glyph.setAttribute("aria-hidden", "true");
    glyph.textContent = hero.emoji;
    btn.appendChild(glyph);
    if (hero.emoji === pendingHeroEmoji) {
      btn.classList.add("selected");
    }
    btn.addEventListener("click", () => {
      for (const other of el.heroPicker.querySelectorAll(".emoji-pick")) {
        other.classList.remove("selected");
      }
      btn.classList.add("selected");
        pendingHeroEmoji = hero.emoji;
        pendingHeroLabel = hero.label;
        updateSetupStartButton();
        persistSetupDraft();
      });
      grid.appendChild(btn);
  }

  el.heroPicker.appendChild(grid);
}

function updateSetupSubtitle(): void {
  el.setupSubtitle.textContent = attackTeachText(CAMPAIGN_WAVES);
}

function showSetup(): void {
  const save = loadSave();
  closeHeroColorPopup();
  pendingHeroEmoji = resolvePickerHeroEmoji(save.playerEmoji ?? player.emoji);
  pendingHeroLabel = getHeroLabelForEmoji(pendingHeroEmoji);
  setupHintForced = false;
  updateSetupSubtitle();
  buildHeroPicker();
  el.heroNameInput.value = save.heroName ?? "";
  pendingHeroColorTheme = resolveHeroColorTheme(save);
  buildHeroColorSwatches();
  applyHeroColorTheme(pendingHeroColorTheme);
  updateSetupStartButton();
  el.setupOverlay.classList.remove("hidden");
  el.gameShell.classList.add("setup-active");
  persistSetupDraft();
}

function hideSetup(): void {
  closeHeroColorPopup();
  el.setupOverlay.classList.add("hidden");
  el.gameShell.classList.remove("setup-active");
}

function confirmHeroAndStart(): boolean {
  const blockers = getSetupBlockers();
  if (blockers.length > 0) {
    showSetupBlockedHint();
    return false;
  }
  const heroName = readHeroNameFromSetup();
  if (!heroName) {
    showSetupBlockedHint();
    return false;
  }
  applyHeroChoice(pendingHeroEmoji, heroName);
  applyHeroColorTheme(readHeroColorThemeFromSetup());
  hideSetup();
  persistStatsOnly();
  if (foe) {
    resetGame();
  }
  return true;
}

function resetGame(): void {
  turn = 1;
  wave = 1;
  defeatVerbIndex = 0;
  foeOrder = buildFoeOrder(player.emoji);
  foeQueue = buildInitialFoeQueue(foeOrder);
  deferredFoeIds = [];
  syncPlayerForCurrentWave({ healToMax: true });
  clearAllHype();
  lastFoeColorTheme = null;
  resetDancePicker();
  combatHints = createCombatHintsState();
  phase = "combat";
  applyCombatGateState(resetCombatGate(combatGateState()));
  clearCombatAnimations();
  stopVictoryCelebration(el.victoryEmojiLayer);
  el.gameOver.classList.add("hidden");
  clearLog();
  startWave();
}

function applyNewRun(): void {
  persistStatsOnly();
  foe = null;
  phase = "combat";
  stopVictoryCelebration(el.victoryEmojiLayer);
  el.gameOver.classList.add("hidden");
  showSetup();
}

function applyClearData(): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(withSaveMeta({ bestWave: 0, runsPlayed: 0 }))
  );
  renderRecords();
  foe = null;
  phase = "combat";
  stopVictoryCelebration(el.victoryEmojiLayer);
  el.gameOver.classList.add("hidden");
  showSetup();
}

async function startNewGame(): Promise<void> {
  await presentConfirm("newRun", applyNewRun);
}

async function resetStats(): Promise<void> {
  await presentConfirm("clearData", applyClearData);
}

function bindActions(): void {
  el.actions.addEventListener("click", (event) => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-action]");
    if (!target) return;

    const action = target.dataset.action;
    if (!canUseCombatActions()) return;

    switch (action) {
      case "attack":
        onAttack();
        break;
      case "heal":
        onHeal();
        break;
      case "dance":
        onDance();
        break;
      case "run":
        onRun();
        break;
    }
    target.blur();
  });

  el.restartBtn.addEventListener("click", () => {
    resetGame();
  });

  el.quitBtn.addEventListener("click", () => {
    void startNewGame();
  });

  el.resetStatsBtn.addEventListener("click", () => {
    void resetStats();
  });

  el.themeToggle.addEventListener("click", () => {
    toggleColorMode();
  });

  el.heroNameInput.addEventListener("input", () => {
    updateSetupStartButton();
    persistSetupDraft();
  });
  bindSetupColorPicker();

  el.setupStartBtn.addEventListener("click", () => {
    if (!confirmHeroAndStart()) {
      return;
    }
    if (!foe) {
      void beginGame();
    } else {
      render();
      persist();
    }
  });
}

function openHelp(): void {
  el.helpOverlay.classList.remove("hidden");
  try {
    sessionStorage.setItem(HELP_OPEN_KEY, "1");
  } catch {
    /* sessionStorage unavailable */
  }
  el.helpClose.focus();
}

function closeHelp(): void {
  el.helpOverlay.classList.add("hidden");
  try {
    sessionStorage.removeItem(HELP_OPEN_KEY);
  } catch {
    /* sessionStorage unavailable */
  }
  el.helpBtn.focus();
}

function restoreHelpDialog(): void {
  try {
    if (sessionStorage.getItem(HELP_OPEN_KEY) === "1") {
      openHelp();
    }
  } catch {
    /* sessionStorage unavailable */
  }
}

function isHelpBackdropTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Node)) {
    return false;
  }
  return !el.helpPanel.contains(target);
}

function dismissHelpFromBackdrop(event: Event): void {
  if (el.helpOverlay.classList.contains("hidden")) {
    return;
  }
  if (!isHelpBackdropTarget(event.target)) {
    return;
  }
  if (event instanceof PointerEvent && event.button !== 0) {
    return;
  }
  event.preventDefault();
  closeHelp();
}

function bindHelpDialog(): void {
  el.helpBtn.addEventListener("click", openHelp);
  el.helpClose.addEventListener("click", closeHelp);
  el.helpOverlay.addEventListener("click", dismissHelpFromBackdrop);
  el.helpOverlay.addEventListener("pointerup", dismissHelpFromBackdrop);

  document.addEventListener("keydown", (event) => {
    if (el.helpOverlay.classList.contains("hidden")) {
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeHelp();
    }
  });
}

async function beginGame(): Promise<void> {
  const save = loadSave();
  if (save.playerEmoji) {
    applyHeroChoice(
      save.playerEmoji,
      resolveSavedHeroName(save, save.playerEmoji)
    );
  }

  const snapshot = loadSnapshot();
  if (snapshot && snapshot.phase === "combat" && snapshot.foe) {
    applySnapshot(snapshot);
    if (battleLogHistory.length === 0) {
      logWaveStart();
    }
    setBattleLines(el.battleText, [
      { text: "Welcome back — your run was restored.", kind: "info" },
      {
        text: `It's your turn against ${foe!.name}!`,
        kind: "player",
      },
    ]);
    revealBattleLog();
    render();
    persist();
    return;
  }

  if (snapshot?.phase === "gameover" || snapshot?.phase === "victory") {
    applySnapshot(snapshot);
    applyCombatGateState(blockCombatForScreenEnd(combatGateState()));
    if (snapshot.phase === "victory") {
      if (battleLogHistory.length === 0) {
        logEndTitle(`Wave ${CAMPAIGN_WAVES} cleared! Total victory!`);
      }
      startVictoryCelebration(
        el.victoryEmojiLayer,
        FOES.map((foe) => foe.emoji),
        player.emoji
      );
      el.gameOverSummary.textContent = `All ${CAMPAIGN_WAVES} waves cleared. Critterwave legend.`;
    } else {
      if (battleLogHistory.length === 0) {
        logEndTitle("GAME OVER");
      }
      el.gameOverSummary.textContent = gameOverSummaryText(snapshot.wave);
    }
    render();
    return;
  }

  resetGame();
}

function finishBoot(): void {
  requestAnimationFrame(() => {
    document.body.classList.remove("is-booting");
  });
}

async function init(): Promise<void> {
  try {
    sessionStorage.removeItem(SKIP_EXIT_FLUSH_KEY);
  } catch {
    /* sessionStorage unavailable */
  }

  initColorMode();
  updateSetupSubtitle();
  bindConfirmDialog();
  bindHelpDialog();
  bindActions();
  bindPageExitPersist();
  bindFooterTeachPopupResize();
  renderRecords();
  restoreHelpDialog();

  const handledDebug = mountDebugHooks();
  if (handledDebug) {
    finishBoot();
    return;
  }

  const save = loadSave();
  if (save.setupActive) {
    showSetup();
    finishBoot();
    restorePendingConfirmIfNeeded();
    maybeRunDebugWin();
    return;
  }

  if (!save.playerEmoji) {
    showSetup();
    finishBoot();
    restorePendingConfirmIfNeeded();
    maybeRunDebugWin();
    return;
  }

  applyHeroChoice(
    save.playerEmoji,
    resolveSavedHeroName(save, save.playerEmoji)
  );
  applyHeroColorTheme(resolveHeroColorTheme(save));
  void beginGame();
  finishBoot();
  restorePendingConfirmIfNeeded();
  maybeRunDebugWin();
}

void init();
