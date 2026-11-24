/** Avoid flashing a loader for normal instant transitions. */
export function delayedTransitionStatus(status: HTMLElement, delay = 170): () => void {
  const timer = window.setTimeout(() => { status.hidden = false; }, delay);
  return () => {
    window.clearTimeout(timer);
    status.hidden = true;
  };
}
