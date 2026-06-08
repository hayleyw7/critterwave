import { isColorThemeId } from "../lib/color-themes.js";
import { createCombatHintsState, combatHintsAfterMidRunRestore, combatHintsForSnapshot, maybeArmDanceHintForWave } from "../lib/combat-hints.js";
import { HYPE_MAX, clampHype } from "../lib/game-logic.js";
import { clampInt, parsePendingConfirm, parseSaveMeta, type PendingConfirmKind, sanitizeGamePhase, sanitizeHypeLevel, sanitizeIdList, sanitizeSnapshotFoe, sanitizeSnapshotPlayer, sanitizeTurn, sanitizeWave } from "../lib/save-validation.js";
import { CAMPAIGN_WAVES, DEFAULT_HERO_EMOJI, PENDING_CONFIRM_OPTIONS, SKIP_EXIT_FLUSH_KEY, STORAGE_KEY } from "./constants.js";
import { FOES_BY_ID, FOE_IDS, HERO_EMOJIS } from "./data.js";
import { el } from "./dom.js";
import { restoreFoeOrder, restoreFoeQueueState, normalizeFoeColorTheme, syncPlayerForCurrentWave, refreshFoeStatsPreservingHp } from "./foe-queue.js";
import { applyHeroColorTheme, applyFoeColorTheme, getHeroLabelForEmoji, ensureFoeColorDistinctFromHero, isHeroColorTheme, readHeroNameFromSetup } from "./presentation.js";
import { gameState } from "./state.js";
import { type BattleLogEntry, type ConfirmOptions, type GameSnapshot, type SaveData } from "./types.js";

export function sanitizeBattleLogHistory(raw: unknown): BattleLogEntry[] | undefined {
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
    const entryWave = clampInt(record.wave, 1, CAMPAIGN_WAVES, 1);
    const attempt = clampInt(
      (record.waveTitle as Record<string, unknown> | undefined)?.attempt,
      1,
      99,
      1
    );
    const waveTitle =
      record.waveTitle && typeof record.waveTitle === "object"
        ? { wave: entryWave, attempt }
        : undefined;
    entries.push({
      title: typeof record.title === "string" ? record.title.slice(0, 80) : undefined,
      waveTitle,
      wave: gameState.wave,
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

export function applyConfirmOptions(options: ConfirmOptions): void {
  el.confirmTitle.textContent = options.title;
  el.confirmMessage.textContent = options.message;
  el.confirmOk.textContent = options.confirmLabel ?? "Yes";
  el.confirmCancel.textContent = options.cancelLabel ?? "Cancel";
  el.confirmOverlay.classList.toggle("confirm-danger", options.danger ?? false);
  el.confirmOverlay.classList.remove("hidden");
}

export function persistPendingConfirm(kind: PendingConfirmKind | null): void {
  const fields = readPersistedFields();
  if (kind) {
    fields.pendingConfirm = kind;
  } else {
    delete fields.pendingConfirm;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(withSaveMeta(fields)));
}

export function presentConfirm(
  kind: PendingConfirmKind,
  onConfirm: () => void
): Promise<boolean> {
  return new Promise((resolve) => {
    applyConfirmOptions(PENDING_CONFIRM_OPTIONS[kind]);
    persistPendingConfirm(kind);
    gameState.confirmResolve = (confirmed) => {
      persistPendingConfirm(null);
      el.confirmOverlay.classList.add("hidden");
      el.confirmOverlay.classList.remove("confirm-danger");
      gameState.confirmResolve = null;
      if (confirmed) {
        onConfirm();
      }
      resolve(confirmed);
    };
    el.confirmCancel.focus();
  });
}

export function closeConfirm(confirmed: boolean): void {
  const resolve = gameState.confirmResolve;
  if (!resolve) {
    return;
  }
  resolve(confirmed);
}

export function restorePendingConfirmIfNeeded(): void {
  const kind = loadSave().pendingConfirm;
  if (!kind) {
    return;
  }
  void presentConfirm(kind, () => {
    confirmHandlers[kind]?.();
  });
}

export function isConfirmBackdropTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Node)) {
    return false;
  }
  return !el.confirmPanel.contains(target);
}

export function dismissConfirmFromBackdrop(event: Event): void {
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

export function bindConfirmDialog(): void {
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

export function getStorageRaw(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function loadSave(): SaveData {
  try {
    const raw = getStorageRaw();
    if (!raw) {
      return { bestWave: 0, runsPlayed: 0, colorMode: gameState.currentColorMode };
    }
    return parseSaveMeta(JSON.parse(raw) as unknown, {
      allowedHeroEmojis: HERO_EMOJIS,
      campaignWaves: CAMPAIGN_WAVES,
    });
  } catch {
    return { bestWave: 0, runsPlayed: 0, colorMode: gameState.currentColorMode };
  }
}

export function withSaveMeta(fields: Record<string, unknown> = {}): Record<string, unknown> {
  const save = loadSave();
  return {
    bestWave: save.bestWave,
    runsPlayed: save.runsPlayed,
    colorMode: gameState.currentColorMode,
    ...fields,
  };
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

export function loadSnapshot(): GameSnapshot | null {
  try {
    const raw = getStorageRaw();
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { snapshot?: GameSnapshot };
    const snap = parsed.snapshot;
    if (!snap) return null;
    return normalizeSnapshot(snap);
  } catch {
    return null;
  }
}

export function normalizeSnapshot(snap: GameSnapshot): GameSnapshot {
  const snapWave = sanitizeWave(snap.wave, CAMPAIGN_WAVES);
  const playerEmoji =
    typeof snap.player?.emoji === "string" ? snap.player.emoji : DEFAULT_HERO_EMOJI;
  const snapPlayer = sanitizeSnapshotPlayer(
    snap.player,
    snapWave,
    HERO_EMOJIS,
    DEFAULT_HERO_EMOJI,
    getHeroLabelForEmoji(playerEmoji)
  );
  const foeNormalized = snap.foe
    ? sanitizeSnapshotFoe(snap.foe, snapWave, FOES_BY_ID)
    : null;

  return {
    player: snapPlayer,
    foe: foeNormalized,
    turn: sanitizeTurn(snap.turn),
    wave: snapWave,
    phase: sanitizeGamePhase(snap.phase),
    hypeLevel: sanitizeHypeLevel(snap.hypeLevel),
    foeHypeLevel: sanitizeHypeLevel(snap.foeHypeLevel),
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

export function persistStatsOnly(): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      withSaveMeta({
        playerEmoji: gameState.player.emoji,
        heroName: gameState.player.name,
        heroColorTheme: gameState.heroColorTheme,
        setupActive: false,
      })
    )
  );
}

export function persistSetupDraft(): void {
  if (el.setupOverlay.classList.contains("hidden")) {
    return;
  }
  const name = readHeroNameFromSetup();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      withSaveMeta({
        playerEmoji: gameState.pendingHeroEmoji,
        heroName: name || undefined,
        heroColorTheme: gameState.pendingHeroColorTheme,
        setupActive: true,
      })
    )
  );
}

export function persist(snapshot?: GameSnapshot): void {
  const preserved = readPersistedFields();
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      withSaveMeta({
        ...preserved,
        playerEmoji: gameState.player.emoji,
        heroName: gameState.player.name,
        heroColorTheme: gameState.heroColorTheme,
        setupActive: !el.setupOverlay.classList.contains("hidden"),
        snapshot: snapshot ?? getSnapshot(),
      })
    )
  );
}

export function isConfirmDialogOpen(): boolean {
  return !el.confirmOverlay.classList.contains("hidden");
}

export function shouldFlushSnapshotOnPageExit(): boolean {
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
  if (gameState.phase === "gameover" || gameState.phase === "victory") {
    return true;
  }
  return gameState.phase === "combat" && gameState.foe !== null;
}

/** Keep mid-run state (including teach popups) when the gameState.player refreshes or leaves. */
export function flushSnapshotOnPageExit(): void {
  if (!shouldFlushSnapshotOnPageExit()) {
    return;
  }
  persist();
}

export function bindPageExitPersist(): void {
  window.addEventListener("pagehide", flushSnapshotOnPageExit);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushSnapshotOnPageExit();
    }
  });
}

export function getSnapshot(): GameSnapshot {
  return {
    player: { ...gameState.player },
    foe: gameState.foe ? { ...gameState.foe } : null,
    turn: gameState.turn,
    wave: gameState.wave,
    phase: gameState.phase,
    hypeLevel: gameState.hypeLevel,
    foeHypeLevel: gameState.foeHypeLevel,
    foeOrderIds: gameState.foeOrder.map((f) => f.id),
    foeQueueIds: gameState.foeQueue,
    deferredFoeIds: gameState.deferredFoeIds,
    foeColorTheme: gameState.foeColorTheme,
    heroColorTheme: gameState.heroColorTheme,
    combatHints: combatHintsForSnapshot(gameState.combatHints),
    battleLogHistory: gameState.battleLogHistory.map((entry) => ({
      ...entry,
      lines: entry.lines.map((line) => ({ ...line })),
      waveTitle: entry.waveTitle ? { ...entry.waveTitle } : undefined,
    })),
  };
}

export function applySnapshot(snapshot: GameSnapshot): void {
  Object.assign(gameState.player, snapshot.player);
  gameState.foe = snapshot.foe ? { ...snapshot.foe } : null;
  gameState.turn = snapshot.turn;
  gameState.wave = snapshot.wave;
  gameState.waveAttempt = 1;
  gameState.phase = snapshot.phase;
  gameState.hypeLevel = clampHype(snapshot.hypeLevel ?? 0);
  gameState.foeHypeLevel = clampHype(snapshot.foeHypeLevel ?? 0);
  gameState.displayedPlayerHype = gameState.hypeLevel;
  gameState.displayedFoeHype = gameState.foeHypeLevel;
  gameState.suppressTeachFlashesThisRender = true;
  gameState.combatHints = combatHintsAfterMidRunRestore(
    createCombatHintsState(snapshot.combatHints ?? {}),
    gameState.hypeLevel,
    gameState.foeHypeLevel
  );
  gameState.foeOrder = restoreFoeOrder(snapshot.foeOrderIds, snapshot.player.emoji);
  const queueState = restoreFoeQueueState(snapshot, gameState.foeOrder);
  gameState.foeQueue = queueState.queue;
  gameState.deferredFoeIds = queueState.deferred;
  if (snapshot.heroColorTheme) {
    applyHeroColorTheme(snapshot.heroColorTheme);
  }
  gameState.foeColorTheme = normalizeFoeColorTheme(snapshot.foeColorTheme);
  gameState.lastFoeColorTheme = gameState.foeColorTheme;
  ensureFoeColorDistinctFromHero();
  applyFoeColorTheme(gameState.foeColorTheme);
  gameState.battleLogHistory.splice(
    0,
    gameState.battleLogHistory.length,
    ...(snapshot.battleLogHistory ?? [])
  );
  if (gameState.wave > CAMPAIGN_WAVES) {
    gameState.wave = CAMPAIGN_WAVES;
  }
  syncPlayerForCurrentWave();
  refreshFoeStatsPreservingHp();
  gameState.combatHints = maybeArmDanceHintForWave(gameState.combatHints, gameState.wave);
}


export type ConfirmHandlerKey = "newRun" | "clearData";

const confirmHandlers: Partial<Record<ConfirmHandlerKey, () => void>> = {};

export function registerConfirmHandlers(
  handlers: Partial<Record<ConfirmHandlerKey, () => void>>
): void {
  Object.assign(confirmHandlers, handlers);
}


