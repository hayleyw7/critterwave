import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

/** Load assembled index.html so src/game/dom.ts can initialize under happy-dom. */
export function bootstrapGameDom(): void {
  const html = readFileSync(join(root, "index.html"), "utf8");
  document.open();
  document.write(html);
  document.close();
}

export const projectRoot = root;
