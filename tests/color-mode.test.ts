/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from "vitest";
import {
  applyColorMode,
  parseColorMode,
  prefersReducedMotion,
  runColorModeTransition,
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
  it("sets data-theme and theme-color meta", () => {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }

    applyColorMode("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(meta.getAttribute("content")).toBe(themeColorForMode("light"));

    applyColorMode("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(meta.getAttribute("content")).toBe(themeColorForMode("dark"));
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
