export const COLOR_THEMES = [
  {
    id: "green",
    label: "Green",
    accent: "#4ade80",
    dark: "#166534",
    plateText: "#dcfce7",
    panelBg: "rgba(22, 101, 52, 0.22)",
    plateBg: "rgba(22, 101, 52, 0.92)",
    hpWrapBg: "rgba(22, 101, 52, 0.38)",
    divider: "rgba(74, 222, 128, 0.45)",
    buffBg: "rgba(22, 163, 74, 0.5)",
  },
  {
    id: "amber",
    label: "Gold",
    accent: "#facc15",
    dark: "#854d0e",
    plateText: "#fef9c3",
    panelBg: "rgba(133, 77, 14, 0.22)",
    plateBg: "rgba(133, 77, 14, 0.92)",
    hpWrapBg: "rgba(133, 77, 14, 0.38)",
    divider: "rgba(250, 204, 21, 0.45)",
    buffBg: "rgba(180, 83, 9, 0.5)",
  },
  {
    id: "rose",
    label: "Rose",
    accent: "#fb7185",
    dark: "#881337",
    plateText: "#ffe4e6",
    panelBg: "rgba(136, 19, 55, 0.22)",
    plateBg: "rgba(136, 19, 55, 0.92)",
    hpWrapBg: "rgba(136, 19, 55, 0.38)",
    divider: "rgba(251, 113, 133, 0.45)",
    buffBg: "rgba(190, 18, 60, 0.5)",
  },
  {
    id: "sky",
    label: "Sky",
    accent: "#38bdf8",
    dark: "#0c4a6e",
    plateText: "#e0f2fe",
    panelBg: "rgba(12, 74, 110, 0.22)",
    plateBg: "rgba(12, 74, 110, 0.92)",
    hpWrapBg: "rgba(12, 74, 110, 0.38)",
    divider: "rgba(56, 189, 248, 0.45)",
    buffBg: "rgba(3, 105, 161, 0.5)",
  },
  {
    id: "coral",
    label: "Coral",
    accent: "#fb923c",
    dark: "#9a3412",
    plateText: "#ffedd5",
    panelBg: "rgba(154, 52, 18, 0.22)",
    plateBg: "rgba(154, 52, 18, 0.92)",
    hpWrapBg: "rgba(154, 52, 18, 0.38)",
    divider: "rgba(251, 146, 60, 0.45)",
    buffBg: "rgba(194, 65, 12, 0.5)",
  },
  {
    id: "fuchsia",
    label: "Pink",
    accent: "#f06ec8",
    dark: "#9d2466",
    plateText: "#fce7f3",
    panelBg: "rgba(157, 36, 102, 0.22)",
    plateBg: "rgba(124, 28, 82, 0.92)",
    hpWrapBg: "rgba(157, 36, 102, 0.38)",
    divider: "rgba(240, 110, 200, 0.48)",
    buffBg: "rgba(200, 50, 140, 0.52)",
  },
] as const;

export type ColorThemeId = (typeof COLOR_THEMES)[number]["id"];

export const COLOR_THEME_IDS: readonly ColorThemeId[] = COLOR_THEMES.map(
  (theme) => theme.id
);

export const DEFAULT_COLOR_THEME: ColorThemeId = "green";

export type ColorThemeDefinition = (typeof COLOR_THEMES)[number];

export type ColorThemeSurfaces = {
  accent: string;
  dark: string;
  panelBg: string;
  plateBg: string;
  plateText: string;
  hpWrapBg: string;
  divider: string;
  buffBg: string;
};

function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) {
    return null;
  }
  return {
    r: Number.parseInt(match[1]!, 16),
    g: Number.parseInt(match[2]!, 16),
    b: Number.parseInt(match[3]!, 16),
  };
}

export function accentTint(accent: string, alpha: number): string {
  const rgb = parseHexColor(accent);
  if (!rgb) {
    return accent;
  }
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function colorThemeSurfaces(
  theme: ColorThemeDefinition,
  mode: "dark" | "light"
): ColorThemeSurfaces {
  if (mode === "dark") {
    return {
      accent: theme.accent,
      dark: theme.dark,
      panelBg: theme.panelBg,
      plateBg: theme.plateBg,
      plateText: theme.plateText,
      hpWrapBg: theme.hpWrapBg,
      divider: theme.divider,
      buffBg: theme.buffBg,
    };
  }

  return {
    accent: theme.accent,
    dark: theme.dark,
    panelBg: `color-mix(in srgb, ${theme.accent} 14%, var(--panel))`,
    plateBg: `color-mix(in srgb, ${theme.accent} 50%, #ffffff)`,
    plateText: theme.dark,
    hpWrapBg: `color-mix(in srgb, ${theme.accent} 26%, #ffffff)`,
    divider: accentTint(theme.accent, 0.5),
    buffBg: accentTint(theme.accent, 0.38),
  };
}

export function isColorThemeId(value: string): value is ColorThemeId {
  return COLOR_THEMES.some((theme) => theme.id === value);
}

export function getColorTheme(id: ColorThemeId) {
  return COLOR_THEMES.find((theme) => theme.id === id) ?? COLOR_THEMES[0]!;
}
