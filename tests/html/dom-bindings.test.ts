import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { describe, expect, it } from "vitest";
import { REQUIRED_DOM_IDS } from "./bundle.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

/** Present in assembled HTML but not bound in src/game/dom.ts. */
const HTML_ONLY_DOM_IDS = ["teach-popup-dock"] as const;

function readDomBindingIds(): string[] {
  const source = readFileSync(join(root, "src/game/dom.ts"), "utf8");
  const ids = new Set<string>();
  for (const match of source.matchAll(/getElementById\("([^"]+)"\)/g)) {
    ids.add(match[1]!);
  }
  return [...ids].sort();
}

describe("dom.ts bindings", () => {
  it("matches REQUIRED_DOM_IDS from tests/html/bundle.ts", () => {
    const boundIds = readDomBindingIds();
    const requiredIds = REQUIRED_DOM_IDS.filter(
      (id) => !HTML_ONLY_DOM_IDS.includes(id as (typeof HTML_ONLY_DOM_IDS)[number])
    ).sort();

    expect(boundIds).toEqual(requiredIds);
  });
});
