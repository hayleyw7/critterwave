import { describe, expect, it } from "vitest";
import {
  DOM_IDS_BY_PARTIAL,
  HTML_PARTIAL_FILES,
  REQUIRED_DOM_IDS,
  readAssembledHtml,
  readHtmlPartial,
} from "./bundle.js";

describe("html assembly", () => {
  it("preserves dom bindings referenced by the game", () => {
    const html = readAssembledHtml();
    for (const id of REQUIRED_DOM_IDS) {
      expect(html, `missing #${id}`).toContain(`id="${id}"`);
    }
  });

  it("loads the module entry and stylesheet hub", () => {
    const html = readAssembledHtml();
    expect(html).toContain('<script type="module" src="js/game.js">');
    expect(html).toContain('<link rel="stylesheet" href="css/styles.css" />');
  });

  it("defines each dom id in the expected partial", () => {
    for (const partial of HTML_PARTIAL_FILES) {
      const html = readHtmlPartial(partial);
      for (const id of DOM_IDS_BY_PARTIAL[partial]) {
        expect(html, `${partial} missing #${id}`).toContain(`id="${id}"`);
      }
    }
  });
});
