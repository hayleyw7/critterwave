/**
 * @vitest-environment happy-dom
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { LEGACY_STORAGE_KEYS, STORAGE_KEY } from "../../src/game/storage-keys.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function runThemeBoot(): void {
  const source = readFileSync(join(root, "assets/theme-boot.js"), "utf8");
  // eslint-disable-next-line no-new-func
  new Function(source)();
}

describe("assets/theme-boot.js", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.innerHTML = "<head></head><body></body>";
    document.head.innerHTML =
      '<meta name="theme-color" content="#0a0612" /><link rel="manifest" href="site.webmanifest" />';
  });

  it("defaults to dark mode when no save exists", () => {
    runThemeBoot();
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.querySelector('link[rel="manifest"]')?.getAttribute("href")).toBe(
      "site.webmanifest"
    );
  });

  it("applies light mode from saved colorMode before game.js loads", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ bestWave: 0, runsPlayed: 0, colorMode: "light" })
    );
    runThemeBoot();
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe(
      "#f8f0ff"
    );
    expect(document.querySelector('link[rel="manifest"]')?.getAttribute("href")).toBe(
      "site-light.webmanifest"
    );
  });

  it("ignores corrupt save data and stays on dark mode", () => {
    localStorage.setItem(STORAGE_KEY, "{not-json");
    runThemeBoot();
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("reads light mode from legacy v6 save before game.js migrates the key", () => {
    const legacyKey = LEGACY_STORAGE_KEYS[0]!;
    localStorage.setItem(
      legacyKey,
      JSON.stringify({ bestWave: 0, runsPlayed: 0, colorMode: "light" })
    );
    runThemeBoot();
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});
