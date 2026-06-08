import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("html build pipeline", () => {
  it("build-html output matches the monolith backup", () => {
    execSync("node scripts/build-html.mjs", { cwd: root, stdio: "pipe" });
    const built = readFileSync(join(root, "index.html"), "utf8");
    const backup = readFileSync(join(root, "scripts/index.html.bak"), "utf8");
    expect(built).toBe(backup);
  });
});
