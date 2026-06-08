import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("security — fonts asset", () => {
  it("ships the VT323 font file in the repo", () => {
    expect(existsSync(join(root, "fonts/VT323-Regular.ttf"))).toBe(true);
  });
});

describe("security — deploy pipeline", () => {
  const deployYml = readFileSync(join(root, ".github/workflows/deploy.yml"), "utf8");
  const dependabotYml = readFileSync(join(root, ".github/dependabot.yml"), "utf8");
  const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };

  it("builds a slim dist artifact for GitHub Pages", () => {
    expect(packageJson.scripts["build:site"]).toContain("build-site.mjs");
    expect(deployYml).toContain("npm run build:site");
    expect(deployYml).toContain("path: dist");
    expect(deployYml).not.toMatch(/path:\s*\.\s*$/m);
  });

  it("enables dependabot for npm", () => {
    expect(dependabotYml).toContain("package-ecosystem: npm");
    expect(dependabotYml).toContain("interval: weekly");
  });
});
