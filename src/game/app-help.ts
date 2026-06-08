import { HELP_OPEN_KEY } from "./constants.js";
import { el } from "./dom.js";

export function openHelp(): void {
  el.helpOverlay.classList.remove("hidden");
  try {
    sessionStorage.setItem(HELP_OPEN_KEY, "1");
  } catch {
    /* sessionStorage unavailable */
  }
  el.helpClose.focus();
}

export function closeHelp(): void {
  el.helpOverlay.classList.add("hidden");
  try {
    sessionStorage.removeItem(HELP_OPEN_KEY);
  } catch {
    /* sessionStorage unavailable */
  }
  el.helpBtn.focus();
}

export function restoreHelpDialog(): void {
  try {
    if (sessionStorage.getItem(HELP_OPEN_KEY) === "1") {
      openHelp();
    }
  } catch {
    /* sessionStorage unavailable */
  }
}

export function isHelpBackdropTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Node)) {
    return false;
  }
  return !el.helpPanel.contains(target);
}

export function dismissHelpFromBackdrop(event: Event): void {
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

export function bindHelpDialog(): void {
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
