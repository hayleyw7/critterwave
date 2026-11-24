/** Avoid flashing a loader for normal instant transitions. */
export function delayedTransitionStatus(status, delay = 170) {
    const timer = window.setTimeout(() => { status.hidden = false; }, delay);
    return () => {
        window.clearTimeout(timer);
        status.hidden = true;
    };
}
