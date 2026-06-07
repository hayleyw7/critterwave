import { FOES as FOES_RAW } from "../data/foes-data.js";
import { assertAlliterativeName } from "../lib/alliteration.js";
import { heroLabelFromFoeName } from "../lib/game-logic.js";
import {
  assertHeroPickerOrderCovers,
  heroPickerOrderIndex,
} from "../lib/hero-groups.js";
import type { FoeTemplate, HeroOption } from "./types.js";

function assertUniqueEmojis(entries: { emoji: string; name?: string; label?: string }[]): void {
  const seen = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.emoji)) {
      throw new Error(`Duplicate emoji ${entry.emoji} (${entry.name ?? entry.label})`);
    }
    seen.add(entry.emoji);
  }
}

function heroesFromFoes(foes: FoeTemplate[]): HeroOption[] {
  return foes.map((foe) => ({
    id: foe.id,
    label: heroLabelFromFoeName(foe.name),
    emoji: foe.emoji,
  }));
}

export const FOES: FoeTemplate[] = FOES_RAW.map((f) => ({ ...f }));
export const HEROES: HeroOption[] = heroesFromFoes(FOES).sort(
  (a, b) => heroPickerOrderIndex(a.emoji) - heroPickerOrderIndex(b.emoji)
);
export const HERO_EMOJIS = new Set(HEROES.map((hero) => hero.emoji));
export const FOES_BY_ID = new Map(FOES.map((foe) => [foe.id, foe]));
export const FOE_IDS = new Set(FOES.map((foe) => foe.id));

for (const foe of FOES) {
  assertAlliterativeName(foe.name);
}
assertUniqueEmojis(FOES);
assertHeroPickerOrderCovers(FOES.map((f) => f.emoji));
