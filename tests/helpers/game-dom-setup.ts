import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

/** Runs before game module tests that use happy-dom. */
export function ensureGameDom(): void {
  if (typeof document === "undefined") {
    return;
  }
  if (document.getElementById("arena")) {
    return;
  }
  const html = readFileSync(join(root, "index.html"), "utf8");
  document.open();
  document.write(html);
  document.close();
}

ensureGameDom();
