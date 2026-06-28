/**
 * Split css/styles.css into module files mirroring src/game/*.
 * Regenerate from css/styles.css.bak after editing the monolith.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const cssDir = path.join(root, "css");
const backupPath = path.join(root, "scripts", "styles.css.bak");
const sourcePath = fs.existsSync(backupPath)
  ? backupPath
  : path.join(cssDir, "styles.css");

const source = fs.readFileSync(sourcePath, "utf8");
const lines = source.split("\n");

function slice(start, end) {
  return lines.slice(start - 1, end).join("\n").trimEnd();
}

function joinSections(sections) {
  return sections.filter(Boolean).join("\n\n") + "\n";
}

/** @type {Record<string, number[][]>} */
const modules = {
  "base.css": [[2, 246]],
  "persistence.css": [[248, 327]],
  "app.css": [
    [329, 415],
    [2098, 2257],
  ],
  "setup.css": [[417, 740]],
  "presentation.css": [
    [742, 1736],
    [2042, 2080],
  ],
  "combat.css": [[1738, 2040]],
  "game-over.css": [
    [2082, 2096],
    [2259, 2575],
  ],
  "utilities.css": [[2577, 2642]],
  "animations.css": [[2644, 2853]],
  "responsive.css": [[2855, 3076]],
};

if (!fs.existsSync(backupPath)) {
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  fs.copyFileSync(path.join(cssDir, "styles.css"), backupPath);
}

for (const [name, ranges] of Object.entries(modules)) {
  const body = joinSections(ranges.map(([s, e]) => slice(s, e)));
  fs.writeFileSync(path.join(cssDir, name), body);
}

const hub = [
  '@import "tokens.css";',
  ...Object.keys(modules).map((name) => `@import "${name}";`),
  "",
].join("\n");

fs.writeFileSync(path.join(cssDir, "styles.css"), hub);
console.log("CSS split complete:", Object.keys(modules).join(", "));
