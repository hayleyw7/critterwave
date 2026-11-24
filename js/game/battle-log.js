import { appendBattleActionMeta, appendBattleLine, setBattleLines, } from "../lib/battle-log-dom.js";
import { colorThemeSurfaces, getColorTheme } from "../lib/color-themes.js";
import { formatFoeInText as formatFoeMessage, playerLevelForWave, WAVES_PER_LEVEL } from "../lib/game-logic.js";
import { el } from "./dom.js";
import { gameState } from "./state.js";
import { getEffectiveAttack, getEffectiveFoeAttack } from "./stats.js";
export function foeDisplayName() {
    return gameState.foe?.name ?? "foe";
}
export function formatFoeInText(template) {
    return formatFoeMessage(template, foeDisplayName());
}
export function rememberBattleLogEntry(lines, action, title, turnOverride = gameState.turn) {
    gameState.battleLogHistory.push({
        title,
        waveTitle: title && title.startsWith("WAVE ")
            ? { wave: gameState.wave, attempt: gameState.waveAttempt }
            : undefined,
        wave: gameState.wave,
        turn: turnOverride,
        action,
        playerAttack: getEffectiveAttack(),
        playerPower: gameState.hypeLevel,
        foeAttack: gameState.foe ? getEffectiveFoeAttack() : null,
        foePower: gameState.foe ? gameState.foeHypeLevel : null,
        foeColorTheme: gameState.foeColorTheme,
        lines: lines.map((line) => ({ ...line })),
    });
}
export function resetBattleLogHistory() {
    gameState.battleLogHistory.length = 0;
}
export function renderGameOverBattleLog() {
    const waveAttemptCounts = new Map();
    for (const entry of gameState.battleLogHistory) {
        if (!entry.waveTitle)
            continue;
        waveAttemptCounts.set(entry.waveTitle.wave, Math.max(waveAttemptCounts.get(entry.waveTitle.wave) ?? 0, entry.waveTitle.attempt));
    }
    el.gameOverBattleLog.replaceChildren();
    for (const entry of gameState.battleLogHistory) {
        const item = document.createElement("li");
        item.className = entry.title
            ? "game-over-log-entry game-over-log-entry-title"
            : "game-over-log-entry";
        const colors = colorThemeSurfaces(getColorTheme(entry.foeColorTheme), gameState.currentColorMode);
        item.style.setProperty("--entry-foe-text", gameState.currentColorMode === "dark" ? colors.accent : colors.plateText);
        if (entry.title) {
            const meta = document.createElement("div");
            meta.className = "game-over-log-meta";
            if (entry.waveTitle && (waveAttemptCounts.get(entry.waveTitle.wave) ?? 1) > 1) {
                meta.textContent = `WAVE ${entry.waveTitle.wave}.${entry.waveTitle.attempt}`;
            }
            else {
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
            appendBattleActionMeta(item, entry.turn, entry.action);
        }
        for (const line of entry.lines) {
            appendBattleLine(item, line.text, line.kind);
        }
        el.gameOverBattleLog.appendChild(item);
    }
}
export function logLine(text, kind = "info", action, turnOverride = gameState.turn, historyText = text) {
    rememberBattleLogEntry([{ text: historyText, kind }], action, undefined, turnOverride);
    el.battleText.textContent = text;
    el.battleText.className = `battle-text battle-${kind}`;
    revealBattleLog();
}
export function logWaveStart() {
    if (!gameState.foe)
        return;
    const title = `WAVE ${gameState.wave}`;
    const lines = [];
    if ((gameState.wave - 1) % WAVES_PER_LEVEL === 0) {
        lines.push({
            text: `LEVEL ${playerLevelForWave(gameState.wave)}: ${gameState.player.maxHp} HP · ATK ${getEffectiveAttack()}`,
            kind: "player",
        });
    }
    lines.push({
        text: `${gameState.foe.name} · ATK ${getEffectiveFoeAttack()} · HP ${gameState.foe.maxHp}`,
        kind: "foe",
    });
    rememberBattleLogEntry(lines, undefined, title);
}
export function logEndTitle(text) {
    rememberBattleLogEntry([], undefined, text);
}
export function levelUpStatsText() {
    return `LEVEL UP · ATK ${getEffectiveAttack()} · HP ${gameState.player.maxHp}`;
}
export function logBattleLines(primary, secondary, action, turnOverride = gameState.turn) {
    rememberBattleLogEntry([primary, secondary], action, undefined, turnOverride);
    setBattleLines(el.battleText, [primary, secondary]);
    revealBattleLog();
}
export function appendDanceHypeSuffix(line, suffix) {
    return suffix ? `${line} ${suffix}` : line;
}
export function danceHypeSuffix(gain, capped) {
    if (gain > 0) {
        return `+${gain} HYPE`;
    }
    if (capped) {
        return "MAX HYPE";
    }
    return "";
}
export function logDanceLines(opener, reaction, opts) {
    const lines = [
        {
            text: appendDanceHypeSuffix(opener, danceHypeSuffix(opts.playerGain, opts.playerCapped)),
            kind: "player",
        },
        {
            text: appendDanceHypeSuffix(reaction, danceHypeSuffix(opts.foeGain, opts.foeCapped)),
            kind: "foe",
        },
    ];
    rememberBattleLogEntry(lines, "Dance", undefined, opts.turnOverride ?? gameState.turn);
    setBattleLines(el.battleText, lines);
    revealBattleLog();
}
export function revealBattleLog() {
    el.battleText.closest(".dialog-box")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}
export function clearLog() {
    resetBattleLogHistory();
    el.battleText.textContent = "What will you do?";
    el.battleText.className = "battle-text battle-info";
}
