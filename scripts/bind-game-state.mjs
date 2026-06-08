/**
 * Bind game.ts body to gameState → writes src/game/internal.ts (line-preserving).
 */
import fs from "node:fs";
import path from "node:path";
import { bindStateBody, fixImportPaths } from "./game-bind-utils.mjs";

const root = process.cwd();
const lines = fs.readFileSync(path.join(root, "src/game.ts.bak"), "utf8").split("\n");

const body = bindStateBody(lines.slice(190).join("\n"));
const header = fixImportPaths(lines.slice(0, 178).join("\n"));

const out = `${header}
import { gameState } from "./state.js";

${body}
`;

fs.mkdirSync(path.join(root, "src/game"), { recursive: true });
fs.writeFileSync(path.join(root, "src/game/internal.ts"), out);
console.log("Wrote src/game/internal.ts", out.split("\n").length, "lines");
