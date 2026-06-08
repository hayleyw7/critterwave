import {
  appendBattleActionMeta,
  appendBattleLine,
  setBattleLines,
  type BattleActionLabel,
} from "../lib/battle-log-dom.js";
import { colorThemeSurfaces, getColorTheme } from "../lib/color-themes.js";
import { formatFoeInText as formatFoeMessage, playerLevelForWave, WAVES_PER_LEVEL } from "../lib/game-logic.js";
import { el } from "./dom.js";
import { gameState } from "./state.js";
import { getEffectiveAttack, getEffectiveFoeAttack } from "./stats.js";
import type { BattleLogEntry } from "./types.js";

export function foeDisplayName(): string {
  return gameState.foe?.name ?? "foe";
}

export function formatFoeInText(template: string): string {
  return formatFoeMessage(template, foeDisplayName());
}

export function rememberBattleLogEntry(
  lines: { text: string; kind: "info" | "player" | "foe" | "win" | "lose" }[],
  action?: BattleActionLabel,
  title?: string,
  turnOverride = gameState.turn
): void {
  gameState.battleLogHistory.push({
    title,
    waveTitle:
      title && title.startsWith("WAVE ")
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

export function resetBattleLogHistory(): void {
  gameState.battleLogHistory.length = 0;
}

export function renderGameOverBattleLog(): void {
  const waveAttemptCounts = new Map<number, number>();
  for (const entry of gameState.battleLogHistory) {
    if (!entry.waveTitle) continue;
    waveAttemptCounts.set(
      entry.waveTitle.wave,
      Math.max(waveAttemptCounts.get(entry.waveTitle.wave) ?? 0, entry.waveTitle.attempt)
    );
  }
  el.gameOverBattleLog.replaceChildren();
  for (const entry of gameState.battleLogHistory) {
    const item = document.createElement("li");
    item.className = entry.title
      ? "game-over-log-entry game-over-log-entry-title"
      : "game-over-log-entry";
    const colors = colorThemeSurfaces(getColorTheme(entry.foeColorTheme), gameState.currentColorMode);
    item.style.setProperty(
      "--entry-foe-text",
      gameState.currentColorMode === "dark" ? colors.accent : colors.plateText
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
      appendBattleActionMeta(item, entry.turn, entry.action);
    }
    for (const line of entry.lines) {
      appendBattleLine(item, line.text, line.kind);
    }
    el.gameOverBattleLog.appendChild(item);
  }
}

export function logLine(
  text: string,
  kind: "info" | "player" | "foe" | "win" | "lose" = "info",
  action?: BattleActionLabel,
  turnOverride = gameState.turn,
  historyText = text
): void {
  rememberBattleLogEntry([{ text: historyText, kind }], action, undefined, turnOverride);
  el.battleText.textContent = text;
  el.battleText.className = `battle-text battle-${kind}`;
  revealBattleLog();
}

export function logWaveStart(): void {
  if (!gameState.foe) return;
  const title = `WAVE ${gameState.wave}`;
  const lines: BattleLogEntry["lines"] = [];
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

export function logEndTitle(text: string): void {
  rememberBattleLogEntry([], undefined, text);
}

export function levelUpStatsText(): string {
  return `LEVEL UP · ATK ${getEffectiveAttack()} · HP ${gameState.player.maxHp}`;
}

export function logBattleLines(
  primary: { text: string; kind: "info" | "player" | "foe" | "win" | "lose" },
  secondary: { text: string; kind: "info" | "player" | "foe" | "win" | "lose" },
  action?: BattleActionLabel,
  turnOverride = gameState.turn
): void {
  rememberBattleLogEntry([primary, secondary], action, undefined, turnOverride);
  setBattleLines(el.battleText, [primary, secondary]);
  revealBattleLog();
}

export function appendDanceHypeSuffix(line: string, suffix: string): string {
  return suffix ? `${line} ${suffix}` : line;
}

export function danceHypeSuffix(gain: number, capped: boolean): string {
  if (gain > 0) {
    return `+${gain} HYPE`;
  }
  if (capped) {
    return "MAX HYPE";
  }
  return "";
}

export function logDanceLines(
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
  rememberBattleLogEntry(lines, "Dance", undefined, opts.turnOverride ?? gameState.turn);
  setBattleLines(el.battleText, lines);
  revealBattleLog();
}

export function revealBattleLog(): void {
  el.battleText.closest(".dialog-box")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

export function clearLog(): void {
  resetBattleLogHistory();
  el.battleText.textContent = "What will you do?";
  el.battleText.className = "battle-text battle-info";
}
