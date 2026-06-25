import { describe, expect, it } from "vitest";
import { readCssModule } from "./bundle.js";

describe("css/app.css — footer", () => {
  it("dims sound menu buttons when a channel is off", () => {
    const app = readCssModule("app.css");
    expect(app).toContain(".meta-menu-toggle.sound-level-off");
  });

  it("uses compact one-line footer labels on narrow or short viewports", () => {
    const responsive = readCssModule("responsive.css");
    expect(responsive).toMatch(
      /@media \(max-width: 480px\), \(max-height: 667px\) \{[\s\S]*?\.records-stat-label--long \{[\s\S]*?display: none;/
    );
    expect(responsive).toMatch(
      /@media \(max-width: 480px\), \(max-height: 667px\) \{[\s\S]*?\.records-stat-label--short \{[\s\S]*?display: inline;/
    );
    expect(responsive).toMatch(
      /@media \(max-width: 480px\), \(max-height: 667px\) \{[\s\S]*?\.records-bar \{[\s\S]*?flex-wrap: nowrap;/
    );
  });
});

describe("css/base.css — fonts", () => {
  it("declares VT323 via @font-face", () => {
    const base = readCssModule("base.css");
    expect(base).toMatch(/@font-face[\s\S]*?font-family:\s*"VT323"/);
    expect(base).toContain('url("../fonts/VT323-Regular.ttf")');
  });
});
