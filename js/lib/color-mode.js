export const DEFAULT_COLOR_MODE = "dark";
const THEME_COLORS = {
    dark: "#0a0612",
    light: "#f8f0ff",
};
export function parseColorMode(value) {
    return value === "light" ? "light" : "dark";
}
export function themeColorForMode(mode) {
    return THEME_COLORS[mode];
}
const MANIFEST_HREF = {
    dark: "site.webmanifest",
    light: "site-light.webmanifest",
};
/** Keeps installed-app chrome in sync with light/dark (paired static manifests). */
export function syncPwaManifest(mode) {
    const link = document.querySelector('link[rel="manifest"]');
    if (!link) {
        return;
    }
    const href = MANIFEST_HREF[mode];
    if (link.getAttribute("href") !== href) {
        link.setAttribute("href", href);
    }
}
export function prefersReducedMotion() {
    return document.documentElement.hasAttribute("data-reduced-motion");
}
export function applyColorMode(mode) {
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
export function runColorModeTransition(update) {
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
