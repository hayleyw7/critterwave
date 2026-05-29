import { cpSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const out = join(root, "dist");

const copyPaths = [
  "index.html",
  "css",
  "js",
  "icons",
  "images",
  "assets",
  "fonts",
  "site.webmanifest",
  ".nojekyll",
];

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (const path of copyPaths) {
  cpSync(join(root, path), join(out, path), { recursive: true });
}

console.log(`Site artifact written to ${out}`);
