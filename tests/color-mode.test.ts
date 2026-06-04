/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from "vitest";
import {
  applyColorMode,
  parseColorMode,
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
