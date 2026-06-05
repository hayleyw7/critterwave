/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from "vitest";
import {
  applyColorMode,
  parseColorMode,
  prefersReducedMotion,
  runColorModeTransition,
  syncPwaManifest,
  themeColorForMode,
} from "../src/lib/color-mode.js";

describe("parseColorMode", () => {
  it("defaults to dark for missing or invalid values", () => {
    expect(parseColorMode(undefined)).toBe("dark");
    expect(parseColorMode("dark")).toBe("dark");
    expect(parseColorMode("neon")).toBe("dark");
  });

  it("accepts light mode", () => {
    expect(parseColorMode("light")).toBe("light");
  });
});

describe("applyColorMode", () => {
  it("sets data-theme, theme-color meta, and manifest link", () => {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    let manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!manifest) {
      manifest = document.createElement("link");
      manifest.setAttribute("rel", "manifest");
      manifest.setAttribute("href", "site.webmanifest");
      document.head.appendChild(manifest);
    }

    applyColorMode("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(meta.getAttribute("content")).toBe(themeColorForMode("light"));
    expect(manifest.getAttribute("href")).toBe("site-light.webmanifest");

    applyColorMode("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(meta.getAttribute("content")).toBe(themeColorForMode("dark"));
    expect(manifest.getAttribute("href")).toBe("site.webmanifest");
  });
});

describe("syncPwaManifest", () => {
  it("swaps manifest href for the active mode", () => {
    for (const el of document.querySelectorAll('link[rel="manifest"]')) {
      el.remove();
    }
    const link = document.createElement("link");
    link.setAttribute("rel", "manifest");
    link.setAttribute("href", "site.webmanifest");
    document.head.appendChild(link);

    syncPwaManifest("light");
    expect(link.getAttribute("href")).toBe("site-light.webmanifest");

    syncPwaManifest("dark");
    expect(link.getAttribute("href")).toBe("site.webmanifest");
  });
});

describe("runColorModeTransition", () => {
  it("runs update immediately when View Transition is unavailable", () => {
    let ran = false;
    runColorModeTransition(() => {
      ran = true;
    });
    expect(ran).toBe(true);
    expect(document.documentElement.classList.contains("color-mode-changing")).toBe(
      false
    );
  });

  it("uses startViewTransition when supported", async () => {
    const original = document.startViewTransition;
    document.startViewTransition = (callback: () => void) => {
      callback();
      return { finished: Promise.resolve() } as ViewTransition;
    };

    let ran = false;
    runColorModeTransition(() => {
      ran = true;
    });
    expect(ran).toBe(true);
    await Promise.resolve();
    expect(document.documentElement.classList.contains("color-mode-changing")).toBe(
      false
    );

    document.startViewTransition = original;
  });
});

describe("prefersReducedMotion", () => {
  it("reflects matchMedia", () => {
    expect(typeof prefersReducedMotion()).toBe("boolean");
  });
});
