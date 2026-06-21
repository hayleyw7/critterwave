import { describe, expect, it } from "vitest";
import { FOES } from "../../src/data/foes-data.js";
import {
  assertHeroPickerOrderCovers,
  estimateHeroPickerColumnCount,
  firstVisibleHeroPickerEmoji,
  columnCountFromGridTemplateColumns,
  HERO_PICKER_ORDER,
  heroPickerEmojisForViewport,
  heroPickerOrderIndex,
  isHeroEmojiHiddenInPicker,
  isMobileHeroPickerViewport,
  MOBILE_HIDDEN_PICKER_EMOJIS,
  resolveHeroPickerEmoji,
  trimHeroPickerEmojisToFullRows,
  visibleHeroPickerEmojis,
} from "../../src/lib/hero-groups.js";

describe("HERO_PICKER_ORDER", () => {
  it("has no duplicate emojis", () => {
    const seen = new Set<string>();
    for (const emoji of HERO_PICKER_ORDER) {
      expect(seen.has(emoji)).toBe(false);
      seen.add(emoji);
    }
  });
});

describe("assertHeroPickerOrderCovers", () => {
  it("accepts the production foe roster", () => {
    expect(() =>
      assertHeroPickerOrderCovers(FOES.map((f) => f.emoji))
    ).not.toThrow();
  });

  it("throws when roster emoji is missing from picker", () => {
    expect(() => assertHeroPickerOrderCovers(["🐱", "🐶"])).toThrow(
      /missing emoji/i
    );
  });

  it("throws when picker has emoji not in roster", () => {
    const rosterEmoji = FOES[0]!.emoji;
    expect(() => assertHeroPickerOrderCovers([rosterEmoji])).toThrow(
      /not in foe roster/i
    );
  });

});

describe("mobile hero picker visibility", () => {
  it("hides devil emoji on mobile only", () => {
    expect(MOBILE_HIDDEN_PICKER_EMOJIS.has("😈")).toBe(true);
    expect(isHeroEmojiHiddenInPicker("😈", true)).toBe(true);
    expect(isHeroEmojiHiddenInPicker("😈", false)).toBe(false);
    expect(isHeroEmojiHiddenInPicker("🐱", true)).toBe(false);
  });

  it("uses the 480px setup mobile breakpoint", () => {
    expect(
      isMobileHeroPickerViewport((query) => query === "(max-width: 480px)")
    ).toBe(true);
    expect(isMobileHeroPickerViewport(() => false)).toBe(false);
  });

  it("picks the first visible emoji in picker order", () => {
    const order = ["😈", "🐱", "🐶", "🐻", "🦁"];
    expect(firstVisibleHeroPickerEmoji(order, true, 4)).toBe("🐱");
    expect(firstVisibleHeroPickerEmoji(order, false, 5)).toBe("😈");
  });

  it("resolves trimmed or hidden saved emojis to the first visible choice", () => {
    expect(resolveHeroPickerEmoji("😈", HERO_PICKER_ORDER, true, 5)).toBe("🐱");
    expect(resolveHeroPickerEmoji("😈", HERO_PICKER_ORDER, false, 5)).toBe("🐱");
    expect(resolveHeroPickerEmoji("🐱", HERO_PICKER_ORDER, true, 5)).toBe("🐱");
  });
});

describe("hero picker row trimming", () => {
  it("estimates column count from container width", () => {
    expect(estimateHeroPickerColumnCount(0)).toBe(1);
    expect(estimateHeroPickerColumnCount(35, 16)).toBe(1);
    expect(estimateHeroPickerColumnCount(200, 16)).toBe(3);
    expect(estimateHeroPickerColumnCount(320, 16)).toBe(5);
    expect(estimateHeroPickerColumnCount(617, 16)).toBe(9);
  });

  it("parses computed grid track counts", () => {
    expect(columnCountFromGridTemplateColumns("")).toBe(0);
    expect(columnCountFromGridTemplateColumns("56px")).toBe(1);
    expect(columnCountFromGridTemplateColumns("56px 56px 56px")).toBe(3);
  });

  it("filters mobile-only hidden emojis before trimming", () => {
    expect(heroPickerEmojisForViewport(HERO_PICKER_ORDER, true)).not.toContain("😈");
    expect(heroPickerEmojisForViewport(HERO_PICKER_ORDER, false)).toContain("😈");
  });

  it("trims partial rows from the end of picker order", () => {
    const order = ["🐱", "🐶", "🐻", "🦁", "🐯", "🐰", "🦊"];
    expect(trimHeroPickerEmojisToFullRows(order, 5)).toEqual([
      "🐱",
      "🐶",
      "🐻",
      "🦁",
      "🐯",
    ]);
    expect(trimHeroPickerEmojisToFullRows(order, 4)).toEqual([
      "🐱",
      "🐶",
      "🐻",
      "🦁",
    ]);
  });

  it("fills complete rows for arbitrary column counts", () => {
    for (const columns of [4, 5, 6, 7, 8, 9]) {
      const visible = visibleHeroPickerEmojis(HERO_PICKER_ORDER, false, columns);
      expect(visible.length).toBeGreaterThan(0);
      expect(visible.length % columns).toBe(0);
    }
  });
});

describe("heroPickerOrderIndex", () => {
  it("returns stable indices for known emojis", () => {
    expect(heroPickerOrderIndex("🐱")).toBe(0);
    expect(heroPickerOrderIndex("🐰")).toBe(7);
  });

  it("sorts unknown emojis last", () => {
    expect(heroPickerOrderIndex("🐱")).toBeLessThan(
      heroPickerOrderIndex("not-an-emoji")
    );
  });
});
