import { CAMPAIGN_WAVE_COUNT } from "../lib/game-logic.js";
import { COLOR_THEME_IDS, DEFAULT_COLOR_THEME } from "../lib/color-themes.js";
import type { HeroColorTheme } from "./types.js";

export const HYPE_METER_FLASH_MS = 450 * 3 + 50;
export const STORAGE_KEY = "critterwave-v6";
export const CAMPAIGN_WAVES = CAMPAIGN_WAVE_COUNT;
export const FOE_POOF_MS = 450;
export const FOE_ENTRANCE_MS = 550;
export const DEATH_BEAT_MS = 1200;
export const GOLD_FLASH_MS = 650;
export const HEAL_ANIM_MS = 420;
export const DANCE_ANIM_MS = 550;
export const XP_FILL_BEAT_MS = 220;
export const DEFAULT_HERO_EMOJI = "🐱";
export const DEFAULT_HERO_LABEL = "Cat";
export const DEFAULT_HERO_NAME = "Hero";
export const FOE_COLOR_THEMES = COLOR_THEME_IDS;
export const DEFAULT_HERO_COLOR_THEME: HeroColorTheme = DEFAULT_COLOR_THEME;
export const SETUP_NAME_TEACH_FLASH_MS = 1400;
export const HP_TEACH_FLASH_MS = 1400;
export const LEVEL_UP_NOTICE_MS = 1800;
export const SKIP_EXIT_FLUSH_KEY = "critterwave-skip-exit-flush";
export const HELP_OPEN_KEY = "critterwave-help-open";
export const MOBILE_TEACH_LAYOUT_MQ = window.matchMedia("(max-width: 768px)");

export const PENDING_CONFIRM_OPTIONS = {
  newRun: {
    title: "Start a new run?",
    message: "Your high score and run count stay. This run can't be continued.",
    confirmLabel: "New Run",
  },
  clearData: {
    title: "Delete everything?",
    message:
      "Permanently delete your critter and all-time play history. This can't be undone.",
    confirmLabel: "Clear Data",
    danger: true,
  },
} as const;
