/** Hidden from hero picker on narrow viewports only (still in roster / desktop picker). */
export const MOBILE_HIDDEN_PICKER_EMOJIS = new Set(["😈"]);
export const MOBILE_HERO_PICKER_MEDIA = "(max-width: 480px)";
/** Matches `.emoji-picker-grid` cell and gap sizes in setup.css. */
export const HERO_PICKER_CELL_REM = 3.5;
export const HERO_PICKER_GAP_REM = 0.4;
export function isMobileHeroPickerViewport(matches = (query) => typeof window !== "undefined" && window.matchMedia(query).matches) {
    return matches(MOBILE_HERO_PICKER_MEDIA);
}
export function isHeroEmojiHiddenInPicker(emoji, mobile) {
    return mobile && MOBILE_HIDDEN_PICKER_EMOJIS.has(emoji);
}
export function heroPickerEmojisForViewport(orderedEmojis, mobile) {
    return orderedEmojis.filter((emoji) => !isHeroEmojiHiddenInPicker(emoji, mobile));
}
export function trimHeroPickerEmojisToFullRows(emojis, columnCount) {
    const columns = Math.max(1, columnCount);
    const trimmedLength = emojis.length - (emojis.length % columns);
    return emojis.slice(0, trimmedLength);
}
export function estimateHeroPickerColumnCount(containerWidthPx, remPx = 16) {
    if (containerWidthPx <= 0) {
        return 1;
    }
    const cellPx = HERO_PICKER_CELL_REM * remPx;
    const gapPx = HERO_PICKER_GAP_REM * remPx;
    return Math.max(1, Math.floor((containerWidthPx + gapPx) / (cellPx + gapPx)));
}
export function columnCountFromGridTemplateColumns(template) {
    return template
        .split(" ")
        .map((track) => track.trim())
        .filter(Boolean).length;
}
export function measureHeroPickerColumnCount(grid) {
    void grid.offsetHeight;
    const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const fromWidth = estimateHeroPickerColumnCount(grid.clientWidth, remPx);
    const fromTracks = columnCountFromGridTemplateColumns(getComputedStyle(grid).gridTemplateColumns);
    if (fromTracks > 1 && fromTracks <= 20) {
        return fromTracks;
    }
    return Math.max(1, fromWidth);
}
/** Picker emojis after mobile-only hides and trimming partial grid rows. */
export function visibleHeroPickerEmojis(orderedEmojis, mobile, columnCount) {
    return trimHeroPickerEmojisToFullRows(heroPickerEmojisForViewport(orderedEmojis, mobile), columnCount);
}
export function firstVisibleHeroPickerEmoji(orderedEmojis, mobile, columnCount) {
    const visible = visibleHeroPickerEmojis(orderedEmojis, mobile, columnCount);
    return visible[0] ?? orderedEmojis[0];
}
/** Fall back when a saved hero is hidden or trimmed from the current viewport. */
export function resolveHeroPickerEmoji(emoji, orderedEmojis, mobile, columnCount) {
    const visible = visibleHeroPickerEmojis(orderedEmojis, mobile, columnCount);
    if (visible.includes(emoji)) {
        return emoji;
    }
    return firstVisibleHeroPickerEmoji(orderedEmojis, mobile, columnCount);
}
/** Flat picker order — similar emojis adjacent, no visible categories. */
export const HERO_PICKER_ORDER = [
    "🐱",
    "🦁",
    "🐯",
    "🐆",
    "🐭",
    "🐀",
    "🐹",
    "🐰",
    "🐿",
    "🦔",
    "🦦",
    "🦨",
    "🦡",
    "🦝",
    "🐕",
    "🐩",
    "🐺",
    "🦊",
    "🐵",
    "🦍",
    "🦧",
    "🐻",
    "🐼",
    "🐨",
    "🦥",
    "🦘",
    "🐴",
    "🦄",
    "🦓",
    "🦌",
    "🐮",
    "🐃",
    "🐷",
    "🐗",
    "🐑",
    "🐐",
    "🐫",
    "🦙",
    "🦒",
    "🐘",
    "🦏",
    "🦛",
    "🦇",
    "🦃",
    "🐔",
    "🥚",
    "🐦",
    "🐧",
    "🦅",
    "🦆",
    "🦢",
    "🦉",
    "🦩",
    "🦚",
    "🦜",
    "🐸",
    "🐊",
    "🐢",
    "🦎",
    "🐍",
    "🐉",
    "🦕",
    "🦖",
    "🦋",
    "🐛",
    "🐜",
    "🐝",
    "🐞",
    "🦗",
    "🦂",
    "🕸",
    "🦟",
    "🦠",
    "🍄",
    "🌳",
    "🌵",
    "🎃",
    "🐚",
    "🦪",
    "🦀",
    "🦞",
    "🦐",
    "🦑",
    "🐙",
    "🐌",
    "🐳",
    "🐬",
    "🐟",
    "🐠",
    "🐡",
    "🦈",
    "🌪",
    "⛄",
    "🤖",
    "👽",
    "💀",
    "👻",
    "🗿",
    "👺",
    "👹",
    "😈",
];
const orderIndex = new Map(HERO_PICKER_ORDER.map((emoji, index) => [emoji, index]));
export function assertHeroPickerOrderCovers(allEmojis) {
    const seen = new Set();
    for (const emoji of HERO_PICKER_ORDER) {
        if (seen.has(emoji)) {
            throw new Error(`Duplicate emoji in hero picker order: ${emoji}`);
        }
        seen.add(emoji);
    }
    for (const emoji of allEmojis) {
        if (!seen.has(emoji)) {
            throw new Error(`Hero picker order missing emoji: ${emoji}`);
        }
    }
    if (seen.size !== allEmojis.length) {
        throw new Error("Hero picker order includes emojis not in foe roster.");
    }
}
export function heroPickerOrderIndex(emoji) {
    return orderIndex.get(emoji) ?? Number.MAX_SAFE_INTEGER;
}
