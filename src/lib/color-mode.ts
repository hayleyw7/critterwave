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

export function applyColorMode(mode: ColorMode): void {
  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", themeColorForMode(mode));
  }
}
