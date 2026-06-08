/**
 * Split monolithic e2e specs into module-aligned files.
 * Regenerate from scripts/e2e/*.spec.bak after editing backups.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const e2eDir = path.join(root, "e2e");

function readLines(file) {
  return fs.readFileSync(file, "utf8").split("\n");
}

function sliceLines(lines, start, end) {
  return lines.slice(start - 1, end).join("\n");
}

function writeSpec(relPath, imports, body) {
  const depth = relPath.split("/").length - 1;
  const prefix = depth ? "../".repeat(depth) : "./";
  const resolvedImports = imports.replaceAll("./helpers/", `${prefix}helpers/`);
  const content = `${resolvedImports}\n\n${body.trimEnd()}\n`;
  const outPath = path.join(e2eDir, relPath);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, content);
}

const game = readLines(path.join(root, "scripts/e2e/game.spec.bak"));
const hints = readLines(path.join(root, "scripts/e2e/combat-hints.spec.bak"));
const security = readLines(path.join(root, "scripts/e2e/security.spec.bak"));

const baseImports = `import { expect, test } from "@playwright/test";
import { patchSaveSnapshot, reloadAfterSavePatch } from "./helpers/save.js";
import { clearSave, clickCombatRun, startFreshRun, STORAGE_KEY } from "./helpers/index.js"`;

const persistenceImports = `${baseImports};
import { clickFooterMenuButton } from "./helpers/app.js"`;

const appImports = `${baseImports};
import { clickFooterMenuButton, openMoreOptions } from "./helpers/app.js"`;

const securityImports = `import { expect, test } from "@playwright/test";
import { patchSavedSnapshot, readSave, writeSave } from "./helpers/security.js";
import { clearSave, startFreshRun } from "./helpers/index.js"`;

writeSpec(
  "setup.spec.ts",
  baseImports,
  [
    sliceLines(game, 15, 27),
    sliceLines(game, 184, 198),
    sliceLines(game, 247, 288),
    sliceLines(hints, 405, 419),
  ].join("\n\n")
);

writeSpec(
  "app.spec.ts",
  appImports,
  [
    sliceLines(game, 83, 122),
    sliceLines(game, 218, 243),
    sliceLines(hints, 667, 690),
  ].join("\n\n")
);

writeSpec(
  "persistence.spec.ts",
  persistenceImports,
  [
    sliceLines(game, 124, 182),
    sliceLines(game, 290, 347),
    sliceLines(hints, 364, 403),
  ].join("\n\n")
);

writeSpec(
  "combat.spec.ts",
  baseImports,
  [
    sliceLines(game, 29, 81),
    sliceLines(hints, 445, 503),
    sliceLines(hints, 648, 665),
  ].join("\n\n")
);

writeSpec(
  "presentation.spec.ts",
  baseImports,
  [
    sliceLines(hints, 5, 247),
    sliceLines(hints, 248, 363),
    sliceLines(hints, 504, 647),
  ].join("\n\n")
);

writeSpec(
  "game-over.spec.ts",
  baseImports,
  [sliceLines(game, 200, 216), sliceLines(game, 349, 440), sliceLines(hints, 420, 444)].join(
    "\n\n"
  )
);

writeSpec("security/save-tampering.spec.ts", securityImports, sliceLines(security, 5, 61));
writeSpec("security/xss.spec.ts", securityImports, sliceLines(security, 63, 79));
writeSpec("security/debug.spec.ts", securityImports, sliceLines(security, 81, 116));
writeSpec(
  "security/setup-hygiene.spec.ts",
  securityImports,
  sliceLines(security, 118, 126)
);

console.log("E2E split complete.");
