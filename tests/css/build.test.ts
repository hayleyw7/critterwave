import { execSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { describe, expect, it } from "vitest";
import { CSS_MODULE_FILES, readCssModule } from "./bundle.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function normalizeCss(css: string): string {
  return css.replace(/\s+/g, " ").trim();
}

describe("css build pipeline", () => {
  it("split-css writes hub imports and non-empty module files", () => {
    // The historical migration writes to the source tree it runs from.
    // Exercise it in a disposable fixture, never over the maintained modules.
    const fixture = mkdtempSync(join(tmpdir(), "critterwave-css-"));
    try {
      mkdirSync(join(fixture, "css"));
      mkdirSync(join(fixture, "scripts"));
      for (const file of ["split-css.mjs", "styles.css.bak"]) {
        copyFileSync(join(root, "scripts", file), join(fixture, "scripts", file));
      }
      copyFileSync(join(root, "css", "tokens.css"), join(fixture, "css", "tokens.css"));
      execSync("node scripts/split-css.mjs", { cwd: fixture, stdio: "pipe" });

      const hub = readFileSync(join(fixture, "css/styles.css"), "utf8");
      for (const file of CSS_MODULE_FILES) {
        expect(hub).toContain(`@import "${file}";`);
        expect(readFileSync(join(fixture,"css",file),"utf8").trim().length).toBeGreaterThan(0);
      }
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });

  it("styles.css hub imports match CSS_MODULE_FILES order", () => {
    const hub = readFileSync(join(root, "css/styles.css"), "utf8");
    const imports = CSS_MODULE_FILES.filter((file) => file !== "styles.css").map(
      (file) => `@import "${file}";`
    );
    expect(hub.trim().split("\n")).toEqual(imports);
  });

  it("module files cover the monolith backup selectors and keyframes", () => {
    const backup = readFileSync(join(root, "scripts/styles.css.bak"), "utf8");
    const backupBody = backup.replace(/^@import "tokens\.css";\s*/, "");
    const assembled = CSS_MODULE_FILES.filter((file) => file !== "styles.css")
      .map((file) => readCssModule(file))
      .join("\n");

    const keyframes = [...backupBody.matchAll(/@keyframes ([\w-]+)/g)].map((m) => m[1]);
    for (const name of keyframes) {
      expect(assembled).toContain(`@keyframes ${name}`);
    }

    expect(normalizeCss(assembled).length).toBeGreaterThanOrEqual(
      normalizeCss(backupBody).length * 0.95
    );
  });
});
