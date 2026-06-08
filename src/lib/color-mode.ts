export type ColorMode = "dark" | "light";

export const DEFAULT_COLOR_MODE: ColorMode = "dark";

const THEME_COLORS: Record<ColorMode, string> = {
  dark: "#0a0612",
  light: "#f8f0ff",
};

export function parseColorMode(value: unknown): ColorMode {
  return value === "light" ? "light" : "dark";
}

export function themeColorForMode(mode: ColorMode): string {
  return THEME_COLORS[mode];
}

const MANIFEST_HREF: Record<ColorMode, string> = {
  dark: "site.webmanifest",
  light: "site-light.webmanifest",
};

/** Keeps installed-app chrome in sync with light/dark (paired static manifests). */
export function syncPwaManifest(mode: ColorMode): void {
  const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (!link) {
    return;
  }
  const href = MANIFEST_HREF[mode];
  if (link.getAttribute("href") !== href) {
    link.setAttribute("href", href);
  }
}

export function prefersReducedMotion(): boolean {
  return (
    typeof matchMedia !== "undefined" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function applyColorMode(mode: ColorMode): void {
  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", themeColorForMode(mode));
  }
  syncPwaManifest(mode);
}

const COLOR_MODE_TRANSITION_MS = 450;

/** Cross-fades the page when toggling light/dark (skipped if reduced motion). */
export function runColorModeTransition(update: () => void): void {
  const root = document.documentElement;
  if (prefersReducedMotion()) {
    update();
    return;
  }

  root.classList.add("color-mode-changing");
  update();
  window.setTimeout(() => {
    root.classList.remove("color-mode-changing");
  }, COLOR_MODE_TRANSITION_MS);
}
