/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyColorMode,
  parseColorMode,
  prefersReducedMotion,
  runColorModeTransition,
  syncPwaManifest,
  themeColorForMode,
} from "../../src/lib/color-mode.js";

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
  afterEach(() => {
    vi.useRealTimers();
    document.documentElement.classList.remove("color-mode-changing");
  });

  it("runs update immediately when reduced motion is requested", () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = (() => ({ matches: true })) as typeof window.matchMedia;

    let ran = false;
    runColorModeTransition(() => {
      ran = true;
    });
    expect(ran).toBe(true);
    expect(document.documentElement.classList.contains("color-mode-changing")).toBe(
      false
    );

    window.matchMedia = originalMatchMedia;
  });

  it("applies the theme update synchronously while the CSS transition class settles", () => {
    vi.useFakeTimers();

    let ran = false;
    runColorModeTransition(() => {
      ran = true;
    });
    expect(ran).toBe(true);
    expect(document.documentElement.classList.contains("color-mode-changing")).toBe(
      true
    );

    vi.advanceTimersByTime(450);
    expect(document.documentElement.classList.contains("color-mode-changing")).toBe(
      false
    );
  });
});

describe("prefersReducedMotion", () => {
  it("reflects matchMedia", () => {
    expect(typeof prefersReducedMotion()).toBe("boolean");
  });
});
