import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const cssDir = join(dirname(fileURLToPath(import.meta.url)), "../../css");

/** CSS modules imported by styles.css, in cascade order. */
export const CSS_MODULE_FILES = [
  "tokens.css",
  "base.css",
  "persistence.css",
  "app.css",
  "setup.css",
  "presentation.css",
  "combat.css",
  "game-over.css",
  "utilities.css",
  "animations.css",
  "responsive.css",
] as const;

export function readCssModule(name: (typeof CSS_MODULE_FILES)[number]): string {
  return readFileSync(join(cssDir, name), "utf8");
}

export function readCssBundle(): string {
  return CSS_MODULE_FILES.map((file) => readCssModule(file)).join("\n");
}
