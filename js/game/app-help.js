import { HELP_OPEN_KEY } from "./constants.js";
import { el } from "./dom.js";
export function openHelp() {
    el.helpOverlay.classList.remove("hidden");
    try {
        sessionStorage.setItem(HELP_OPEN_KEY, "1");
    }
    catch {
        /* sessionStorage unavailable */
    }
    el.helpClose.focus();
}
export function closeHelp() {
    el.helpOverlay.classList.add("hidden");
    try {
        sessionStorage.removeItem(HELP_OPEN_KEY);
    }
    catch {
        /* sessionStorage unavailable */
    }
    el.helpBtn.focus();
}
export function restoreHelpDialog() {
    try {
        if (sessionStorage.getItem(HELP_OPEN_KEY) === "1") {
            openHelp();
        }
    }
    catch {
        /* sessionStorage unavailable */
    }
}
export function isHelpBackdropTarget(target) {
    if (!(target instanceof Node)) {
        return false;
    }
    return !el.helpPanel.contains(target);
}
export function dismissHelpFromBackdrop(event) {
    if (el.helpOverlay.classList.contains("hidden")) {
        return;
    }
    if (!isHelpBackdropTarget(event.target)) {
        return;
    }
    if (event instanceof PointerEvent && event.button !== 0) {
        return;
    }
    event.preventDefault();
    closeHelp();
}
export function bindHelpDialog() {
    el.helpBtn.addEventListener("click", openHelp);
    el.helpClose.addEventListener("click", closeHelp);
    el.helpOverlay.addEventListener("click", dismissHelpFromBackdrop);
    el.helpOverlay.addEventListener("pointerup", dismissHelpFromBackdrop);
    document.addEventListener("keydown", (event) => {
        if (el.helpOverlay.classList.contains("hidden")) {
            return;
        }
        if (event.key === "Escape") {
            event.preventDefault();
            closeHelp();
        }
    });
}
