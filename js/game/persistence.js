import { isColorThemeId } from "../lib/color-themes.js";
import { createCombatHintsState, combatHintsAfterMidRunRestore, combatHintsForSnapshot, maybeArmDanceHintForWave } from "../lib/combat-hints.js";
import { HYPE_MAX, clampHype } from "../lib/game-logic.js";
import { clampInt, sanitizeGamePhase, sanitizeHypeLevel, sanitizeIdList, sanitizeSnapshotFoe, sanitizeSnapshotPlayer, sanitizeTurn, sanitizeWave } from "../lib/save-validation.js";
import { applyFoeColorTheme, applyHeroColorTheme, ensureFoeColorDistinctFromHero } from "./colors.js";
import { CAMPAIGN_WAVES, DEFAULT_HERO_EMOJI, PENDING_CONFIRM_OPTIONS, SKIP_EXIT_FLUSH_KEY } from "./constants.js";
import { FOES_BY_ID, FOE_IDS, HERO_EMOJIS } from "./data.js";
import { el } from "./dom.js";
import { restoreFoeOrder, restoreFoeQueueState, normalizeFoeColorTheme, syncPlayerForCurrentWave, refreshFoeStatsPreservingHp } from "./foe-queue.js";
import { getHeroLabelForEmoji, isHeroColorTheme, readHeroNameFromSetup } from "./hero-setup.js";
import { getStorageRaw, loadSave as loadSaveWithMode, readPersistedFields, withSaveMeta as withSaveMetaForMode, writeSaveJson, } from "./save-io.js";
import { gameState } from "./state.js";
export { getStorageRaw, readPersistedFields };
export function loadSave() {
    return loadSaveWithMode(gameState.currentColorMode);
}
export function withSaveMeta(fields = {}) {
    return withSaveMetaForMode(fields, gameState.currentColorMode);
}
export function sanitizeBattleLogHistory(raw) {
    if (!Array.isArray(raw))
        return undefined;
    const entries = [];
    for (const entry of raw.slice(-200)) {
        if (!entry || typeof entry !== "object")
            continue;
        const record = entry;
        const linesRaw = Array.isArray(record.lines) ? record.lines : [];
        const lines = linesRaw
            .map((line) => {
            if (!line || typeof line !== "object")
                return null;
            const lineRecord = line;
            const text = typeof lineRecord.text === "string" ? lineRecord.text : "";
            const kind = lineRecord.kind;
            if (kind !== "info" &&
                kind !== "player" &&
                kind !== "foe" &&
                kind !== "win" &&
                kind !== "lose") {
                return null;
            }
            return { text: text.slice(0, 240), kind };
        })
            .filter((line) => !!line);
        const action = record.action;
        const safeAction = action === "Attack" || action === "Heal" || action === "Dance" || action === "Run"
            ? action
            : undefined;
        const entryWave = clampInt(record.wave, 1, CAMPAIGN_WAVES, 1);
        const attempt = clampInt(record.waveTitle?.attempt, 1, 99, 1);
        const waveTitle = record.waveTitle && typeof record.waveTitle === "object"
            ? { wave: entryWave, attempt }
            : undefined;
        entries.push({
            title: typeof record.title === "string" ? record.title.slice(0, 80) : undefined,
            waveTitle,
            wave: gameState.wave,
            turn: clampInt(record.turn, 1, 99999, 1),
            action: safeAction,
            playerAttack: clampInt(record.playerAttack, 0, 999, 0),
            playerPower: clampInt(record.playerPower, 0, HYPE_MAX, 0),
            foeAttack: typeof record.foeAttack === "number"
                ? clampInt(record.foeAttack, 0, 999, 0)
                : null,
            foePower: typeof record.foePower === "number"
                ? clampInt(record.foePower, 0, HYPE_MAX, 0)
                : null,
            foeColorTheme: typeof record.foeColorTheme === "string" && isColorThemeId(record.foeColorTheme)
                ? record.foeColorTheme
                : "amber",
            lines,
        });
    }
    return entries.length > 0 ? entries : undefined;
}
export function applyConfirmOptions(options) {
    el.confirmTitle.textContent = options.title;
    el.confirmMessage.textContent = options.message;
    el.confirmOk.textContent = options.confirmLabel ?? "Yes";
    el.confirmCancel.textContent = options.cancelLabel ?? "Cancel";
    el.confirmOverlay.classList.toggle("confirm-danger", options.danger ?? false);
    el.confirmOverlay.classList.remove("hidden");
}
export function persistPendingConfirm(kind) {
    const fields = readPersistedFields();
    if (kind) {
        fields.pendingConfirm = kind;
    }
    else {
        delete fields.pendingConfirm;
    }
    writeSaveJson(withSaveMeta(fields));
}
export function presentConfirm(kind, onConfirm) {
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
export function closeConfirm(confirmed) {
    const resolve = gameState.confirmResolve;
    if (!resolve) {
        return;
    }
    resolve(confirmed);
}
export function restorePendingConfirmIfNeeded() {
    const kind = loadSave().pendingConfirm;
    if (!kind) {
        return;
    }
    void presentConfirm(kind, () => {
        confirmActions[kind]?.();
    });
}
export function isConfirmBackdropTarget(target) {
    if (!(target instanceof Node)) {
        return false;
    }
    return !el.confirmPanel.contains(target);
}
export function dismissConfirmFromBackdrop(event) {
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
export function bindConfirmDialog() {
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
export function loadSnapshot() {
    try {
        const raw = getStorageRaw();
        if (!raw)
            return null;
        const parsed = JSON.parse(raw);
        const snap = parsed.snapshot;
        if (!snap)
            return null;
        return normalizeSnapshot(snap);
    }
    catch {
        return null;
    }
}
export function normalizeSnapshot(snap) {
    const snapWave = sanitizeWave(snap.wave, CAMPAIGN_WAVES);
    const phase = sanitizeGamePhase(snap.phase);
    const playerEmoji = typeof snap.player?.emoji === "string" ? snap.player.emoji : DEFAULT_HERO_EMOJI;
    const snapPlayer = sanitizeSnapshotPlayer(snap.player, snapWave, HERO_EMOJIS, DEFAULT_HERO_EMOJI, getHeroLabelForEmoji(playerEmoji));
    const foeNormalized = snap.foe
        ? sanitizeSnapshotFoe(snap.foe, snapWave, FOES_BY_ID)
        : null;
    return {
        player: snapPlayer,
        foe: foeNormalized,
        turn: sanitizeTurn(snap.turn),
        wave: snapWave,
        phase,
        isNewRecord: phase === "gameover" && snap.isNewRecord === true,
        hypeLevel: sanitizeHypeLevel(snap.hypeLevel),
        foeHypeLevel: sanitizeHypeLevel(snap.foeHypeLevel),
        foeOrderIds: sanitizeIdList(snap.foeOrderIds, FOE_IDS),
        foeColorTheme: snap.foeColorTheme,
        heroColorTheme: snap.heroColorTheme && isHeroColorTheme(snap.heroColorTheme)
            ? snap.heroColorTheme
            : undefined,
        combatHints: createCombatHintsState(snap.combatHints ?? {}),
        foeQueueIds: sanitizeIdList(snap.foeQueueIds, FOE_IDS),
        deferredFoeIds: sanitizeIdList(snap.deferredFoeIds, FOE_IDS),
        battleLogHistory: sanitizeBattleLogHistory(snap.battleLogHistory),
    };
}
export function persistStatsOnly() {
    writeSaveJson(withSaveMeta({
        playerEmoji: gameState.player.emoji,
        heroName: gameState.player.name,
        heroColorTheme: gameState.heroColorTheme,
        setupActive: false,
    }));
}
export function persistSetupDraft() {
    if (el.setupOverlay.classList.contains("hidden")) {
        return;
    }
    const name = readHeroNameFromSetup();
    writeSaveJson(withSaveMeta({
        playerEmoji: gameState.pendingHeroEmoji,
        heroName: name || undefined,
        heroColorTheme: gameState.pendingHeroColorTheme,
        setupActive: true,
    }));
}
export function persist(snapshot) {
    const preserved = readPersistedFields();
    writeSaveJson(withSaveMeta({
        ...preserved,
        playerEmoji: gameState.player.emoji,
        heroName: gameState.player.name,
        heroColorTheme: gameState.heroColorTheme,
        setupActive: !el.setupOverlay.classList.contains("hidden"),
        snapshot: snapshot ?? getSnapshot(),
    }));
}
export function isConfirmDialogOpen() {
    return !el.confirmOverlay.classList.contains("hidden");
}
export function shouldFlushSnapshotOnPageExit() {
    try {
        if (sessionStorage.getItem(SKIP_EXIT_FLUSH_KEY) === "1") {
            return false;
        }
    }
    catch {
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
export function flushSnapshotOnPageExit() {
    if (!shouldFlushSnapshotOnPageExit()) {
        return;
    }
    persist();
}
export function bindPageExitPersist() {
    window.addEventListener("pagehide", flushSnapshotOnPageExit);
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
            flushSnapshotOnPageExit();
        }
    });
}
export function getSnapshot() {
    return {
        player: { ...gameState.player },
        foe: gameState.foe ? { ...gameState.foe } : null,
        turn: gameState.turn,
        wave: gameState.wave,
        phase: gameState.phase,
        isNewRecord: gameState.phase === "gameover" && gameState.isNewRecord,
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
export function applySnapshot(snapshot) {
    Object.assign(gameState.player, snapshot.player);
    gameState.foe = snapshot.foe ? { ...snapshot.foe } : null;
    gameState.turn = snapshot.turn;
    gameState.wave = snapshot.wave;
    gameState.waveAttempt = 1;
    gameState.phase = snapshot.phase;
    gameState.isNewRecord = snapshot.phase === "gameover" && snapshot.isNewRecord === true;
    gameState.hypeLevel = clampHype(snapshot.hypeLevel ?? 0);
    gameState.foeHypeLevel = clampHype(snapshot.foeHypeLevel ?? 0);
    gameState.displayedPlayerHype = gameState.hypeLevel;
    gameState.displayedFoeHype = gameState.foeHypeLevel;
    gameState.suppressTeachFlashesThisRender = true;
    gameState.combatHints = combatHintsAfterMidRunRestore(createCombatHintsState(snapshot.combatHints ?? {}), gameState.hypeLevel, gameState.foeHypeLevel);
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
    gameState.battleLogHistory.splice(0, gameState.battleLogHistory.length, ...(snapshot.battleLogHistory ?? []));
    if (gameState.wave > CAMPAIGN_WAVES) {
        gameState.wave = CAMPAIGN_WAVES;
    }
    syncPlayerForCurrentWave();
    refreshFoeStatsPreservingHp();
    gameState.combatHints = maybeArmDanceHintForWave(gameState.combatHints, gameState.wave);
}
const confirmActions = {};
export function setConfirmActions(actions) {
    Object.assign(confirmActions, actions);
}
