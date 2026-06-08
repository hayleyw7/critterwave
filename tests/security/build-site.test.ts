import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { describe, expect, it } from "vitest";
import { CSS_MODULE_FILES } from "../css/bundle.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("security — build:site output", () => {
  it("copies public assets only", () => {
    execSync("npm run build:site", { cwd: root, stdio: "pipe" });
    const dist = join(root, "dist");

    for (const path of [
      "index.html",
      "css/styles.css",
      ...CSS_MODULE_FILES.map((file) => `css/${file}`),
      "js/game.js",
      "fonts/VT323-Regular.ttf",
      "site.webmanifest",
      "site-light.webmanifest",
    ]) {
      expect(existsSync(join(dist, path))).toBe(true);
    }

    expect(existsSync(join(dist, "src"))).toBe(false);
    expect(existsSync(join(dist, "tests"))).toBe(false);
    expect(existsSync(join(dist, "e2e"))).toBe(false);
    expect(existsSync(join(dist, "package.json"))).toBe(false);

    const distIndex = readFileSync(join(dist, "index.html"), "utf8");
    expect(distIndex).toContain("Content-Security-Policy");
  });
});
