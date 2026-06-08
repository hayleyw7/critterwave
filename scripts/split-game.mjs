/**
 * Split src/game.ts into src/game/* modules using shared gameState.
 * Binds state on the full file first, then slices — avoids cross-slice binding bugs.
 * Run: node scripts/split-game.mjs
 */
import fs from "node:fs";
import path from "node:path";
import {
  bindStateBody,
  fixImportPaths,
  findFunctionLine,
  sliceFunctionBlock,
} from "./game-bind-utils.mjs";

const root = process.cwd();
const srcPath = path.join(root, "src/game.ts");
const bakPath = path.join(root, "src/game.ts.bak");
const outDir = path.join(root, "src/game");
const sourceLines = fs.readFileSync(bakPath, "utf8").split("\n");

function slice(lines, start, end) {
  return lines.slice(start - 1, end).join("\n");
}

function exportFunctions(code) {
  return code.replace(/^(async )?function ([a-zA-Z0-9_]+)/gm, "export $1function $2");
}

const baseImports = fixImportPaths(slice(sourceLines, 1, 179));

const boundBodyLines = bindStateBody(sourceLines.slice(190).join("\n")).split("\n");
const lines = [...sourceLines.slice(0, 190), ...boundBodyLines];

if (lines.length !== sourceLines.length) {
  throw new Error(
    `Line count drift: expected ${sourceLines.length}, got ${lines.length}`
  );
}

function boundSlice(start, end) {
  return lines.slice(start - 1, end).join("\n");
}

function fnSlice(startName, endBeforeName) {
  return sliceFunctionBlock(lines, startName, endBeforeName);
}

const modules = {
  "foe-queue.ts": {
    ranges: [[191, 228], [237, 265]],
    extra: "",
  },
  "stats.ts": {
    ranges: [[229, 236], [1056, 1071]],
    extra: "",
  },
  "persistence.ts": {
    ranges: [[312, 377], [381, 514], [545, 716], [777, 840]],
    extra: `import { buildFoeOrder, restoreFoeOrder, restoreFoeQueueState, normalizeFoeColorTheme, syncPlayerForCurrentWave, refreshFoeStatsPreservingHp } from "./foe-queue.js";
import {
  applyHeroColorTheme,
  applyFoeColorTheme,
  getHeroLabelForEmoji,
  ensureFoeColorDistinctFromHero,
  isHeroColorTheme,
  readHeroNameFromSetup,
} from "./presentation.js";
`,
    patch: (code) =>
      code.replace(
        /void presentConfirm\(kind, \(\) => \{\s*if \(kind === "newRun"\) \{\s*applyNewRun\(\);\s*\} else \{\s*applyClearData\(\);\s*\}\s*\}\);/s,
        "void presentConfirm(kind, () => {\n    confirmHandlers[kind]?.();\n  });"
      ) +
      `\n\nexport type ConfirmHandlerKey = "newRun" | "clearData";\n\nconst confirmHandlers: Partial<Record<ConfirmHandlerKey, () => void>> = {};\n\nexport function registerConfirmHandlers(\n  handlers: Partial<Record<ConfirmHandlerKey, () => void>>\n): void {\n  Object.assign(confirmHandlers, handlers);\n}\n`,
  },
  "presentation.ts": {
    ranges: [
      [516, 543],
      [718, 776],
      [841, 991],
      [993, 1054],
      [1073, 1251],
      [1253, 1972],
      [2166, 2170],
    ],
    extra: `import { getCampaignLength, getHealMax, getEffectiveAttack, getEffectiveFoeAttack } from "./stats.js";
import { persist, persistSetupDraft, loadSave, withSaveMeta, readPersistedFields } from "./persistence.js";
`,
    patch: (code) =>
      `let endGameHandler: (() => void) | null = null;

export function registerEndGameHandler(handler: () => void): void {
  endGameHandler = handler;
}

` +
      code
        .replace(/\bendGame\(\);/g, "endGameHandler?.();")
        .replace(
          /export function toggleColorMode\(\): void \{\s*\n\s*el\.footerMore\.open = false;\s*\n\s*gameState\.currentColorMode = gameState\.currentColorMode === "dark" \? "light" : "dark";\s*\n\s*runColorModeTransition\(\(\) => \{\s*\n\s*applyColorMode\(gameState\.currentColorMode\);/,
          `export function toggleColorMode(): void {
  el.footerMore.open = false;
  const nextMode = gameState.currentColorMode === "dark" ? "light" : "dark";
  gameState.currentColorMode = nextMode;
  runColorModeTransition(() => {
    applyColorMode(nextMode);`
        ),
  },
  "combat.ts": {
    ranges: [[1974, 2164], [2172, 2303], [2565, 2889], [2992, 3011]],
    extra: `import { getCampaignLength, getHealMax, getEffectiveAttack, getEffectiveFoeAttack } from "./stats.js";
import { buildFoeOrder, restoreFoeOrder, spawnFoeFromQueue, syncPlayerForCurrentWave } from "./foe-queue.js";
import {
  render,
  syncCombatHintClasses,
  playFirstHealHpFlash,
  playFirstPlayerDamageHpFlash,
  playFirstAttackFoeHpFlash,
  playFirstWaveVictoryHealHpFlash,
  playHeroHeal,
  playHeroDance,
  playFoeDance,
  playRunExit,
  playFoeEntrance,
  playFoePoof,
  playFoeDefeat,
  handlePlayerDeath,
  showDamagePop,
  briefClass,
  clearCombatAnimations,
  clearHitReact,
  playLevelUpNotice,
  pause,
  logLine,
  logBattleLines,
  logDanceLines,
  logWaveStart,
  logEndTitle,
  clearLog,
  revealBattleLog,
  applyFoeColorTheme,
  pickNextFoeColor,
  playXpBarFullBeat,
  clearAllHype,
  applyPlayerDanceBuff,
  applyFoeDanceBuff,
  applyPlayerHitHypeLoss,
  applyFoeHitHypeLoss,
  formatFoeInText,
} from "./presentation.js";
import { persist, getSnapshot, loadSave, withSaveMeta } from "./persistence.js";
`,
  },
  "app.ts": {
    ranges: [[2305, 2563], [2891, 2991], [3013, 3311]],
    extra: `import { getCampaignLength } from "./stats.js";
import {
  persist,
  persistStatsOnly,
  persistSetupDraft,
  loadSave,
  loadSnapshot,
  applySnapshot,
  registerConfirmHandlers,
  bindConfirmDialog,
  bindPageExitPersist,
  restorePendingConfirmIfNeeded,
  withSaveMeta,
  presentConfirm,
} from "./persistence.js";
import {
  initColorMode,
  updateThemeToggleUi,
  toggleColorMode,
  applyHeroColorTheme,
  resolveHeroColorTheme,
  resolveSavedHeroName,
  getHeroLabelForEmoji,
  bindSetupColorPicker,
  updateSetupStartButton,
  buildHeroColorSwatches,
  closeHeroColorPopup,
  render,
  renderRecords,
  bindCombatTeachPopupDismissal,
  bindFooterTeachPopupResize,
  logWaveStart,
  logEndTitle,
  revealBattleLog,
  clearLog,
  getSetupBlockers,
  showSetupBlockedHint,
  readHeroNameFromSetup,
  readHeroColorThemeFromSetup,
  registerEndGameHandler,
} from "./presentation.js";
import {
  resetGame,
  startWave,
  endGame,
  winCampaign,
  gameOverSummaryText,
  onAttack,
  onHeal,
  onDance,
  onRun,
  canUseCombatActions,
  applyCombatGateState,
  combatGateState,
} from "./combat.js";
`,
    patch: (code) =>
      code
        .replace(
          /export async function init\(\): Promise<void> \{/,
          `export async function init(): Promise<void> {
  registerConfirmHandlers({
    newRun: applyNewRun,
    clearData: applyClearData,
  });
  registerEndGameHandler(endGame);`
        )
        .replace(/\nvoid init\(\);\s*$/, "\n"),
  },
};

fs.mkdirSync(outDir, { recursive: true });

for (const [name, { ranges, extra = "", patch = (c) => c }] of Object.entries(modules)) {
  const body = ranges.map(([s, e]) => boundSlice(s, e)).join("\n\n");
  const content = `${baseImports}
import { gameState } from "./state.js";
${extra}
${patch(exportFunctions(body))}
`;
  fs.writeFileSync(path.join(outDir, name), content);
}

fs.writeFileSync(
  srcPath,
  `import { init } from "./game/app.js";

declare global {
  interface Window {
    critterwave?: {
      win: () => void;
      lose?: () => void;
      winLog?: () => void;
      loseLog?: () => void;
    };
  }
}

void init();
`
);

console.log("Split complete. Run: npm run build");
