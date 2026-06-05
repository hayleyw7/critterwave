import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const indexHtml = readFileSync(join(root, "index.html"), "utf8");
const styles = readFileSync(join(root, "css/styles.css"), "utf8");
const deployYml = readFileSync(join(root, ".github/workflows/deploy.yml"), "utf8");
const dependabotYml = readFileSync(join(root, ".github/dependabot.yml"), "utf8");
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
  scripts: Record<string, string>;
};

describe("security — static HTML headers", () => {
  it("sets a strict Content-Security-Policy", () => {
    expect(indexHtml).toContain('http-equiv="Content-Security-Policy"');
    expect(indexHtml).toContain("default-src 'self'");
    expect(indexHtml).toContain("script-src 'self'");
    expect(indexHtml).toContain("frame-ancestors 'none'");
  });

  it("sets referrer and permissions policies", () => {
    expect(indexHtml).toContain('name="referrer" content="strict-origin-when-cross-origin"');
    expect(indexHtml).toContain("Permissions-Policy");
    expect(indexHtml).toContain("camera=()");
  });

  it("does not load third-party fonts", () => {
    expect(indexHtml).not.toContain("fonts.googleapis.com");
    expect(indexHtml).not.toContain("fonts.gstatic.com");
  });

  it("loads only same-origin script module", () => {
    expect(indexHtml).toContain('<script type="module" src="js/game.js">');
    expect(indexHtml).not.toMatch(/<script[^>]*src=["']https?:/);
  });
});

describe("security — self-hosted fonts", () => {
  it("declares VT323 via @font-face", () => {
    expect(styles).toMatch(/@font-face[\s\S]*?font-family:\s*"VT323"/);
    expect(styles).toContain('url("../fonts/VT323-Regular.ttf")');
  });

  it("ships the font file in the repo", () => {
    expect(existsSync(join(root, "fonts/VT323-Regular.ttf"))).toBe(true);
  });
});

describe("security — deploy pipeline", () => {
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

describe("security — build:site output", () => {
  it("copies public assets only", () => {
    execSync("npm run build:site", { cwd: root, stdio: "pipe" });
    const dist = join(root, "dist");

    for (const path of [
      "index.html",
      "css/styles.css",
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
