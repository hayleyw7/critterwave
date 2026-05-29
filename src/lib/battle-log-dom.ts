export type BattleLineKind = "info" | "player" | "foe" | "win" | "lose";

export function appendBattleLine(
  parent: HTMLElement,
  text: string,
  kind: BattleLineKind
): HTMLSpanElement {
  const span = document.createElement("span");
  span.className = `battle-line battle-${kind}`;
  span.textContent = text;
  parent.appendChild(span);
  return span;
}

export function setBattleLines(
  container: HTMLElement,
  lines: { text: string; kind: BattleLineKind }[],
  wrapperClass = "battle-text"
): void {
  container.replaceChildren();
  container.className = wrapperClass;
  for (const line of lines) {
    appendBattleLine(container, line.text, line.kind);
  }
}

/** Appends a hype tail built by formatDanceHypeTail (trusted static markup + escaped names). */
export function appendBattleHypeTail(container: HTMLElement, tailHtml: string): void {
  if (!tailHtml) {
    return;
  }
  const span = document.createElement("span");
  span.className = "battle-line battle-hype-line";
  span.innerHTML = tailHtml;
  container.appendChild(span);
}
