function battleActionClass(action) {
    return `battle-action-${action.toLowerCase()}`;
}
export function appendBattleLine(parent, text, kind) {
    const span = document.createElement("span");
    span.className = `battle-line battle-${kind}`;
    span.textContent = text;
    parent.appendChild(span);
    return span;
}
export function setBattleLines(container, lines, wrapperClass = "battle-text") {
    container.replaceChildren();
    container.className = wrapperClass;
    for (const line of lines) {
        appendBattleLine(container, line.text, line.kind);
    }
}
export function appendBattleActionMeta(parent, turn, action) {
    const meta = document.createElement("div");
    meta.className = "game-over-log-meta";
    meta.append(`Turn ${turn} - `);
    const actionLabel = document.createElement("span");
    actionLabel.className = `battle-action ${battleActionClass(action)}`;
    actionLabel.textContent = action;
    meta.appendChild(actionLabel);
    parent.appendChild(meta);
    return meta;
}
/** Appends a hype tail built by formatDanceHypeTail (trusted static markup + escaped names). */
export function appendBattleHypeTail(container, tailHtml) {
    if (!tailHtml) {
        return;
    }
    const span = document.createElement("span");
    span.className = "battle-line battle-hype-line";
    span.innerHTML = tailHtml;
    container.appendChild(span);
}
