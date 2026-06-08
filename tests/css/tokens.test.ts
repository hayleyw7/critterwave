import { describe, expect, it } from "vitest";
import { readCssModule } from "./bundle.js";

describe("css/tokens.css — light theme", () => {
  const tokens = readCssModule("tokens.css");

  it("defines light theme surface tokens", () => {
    expect(tokens).toMatch(/html\[data-theme="light"\][\s\S]*?--bg-deep:/);
    expect(tokens).toMatch(/html\[data-theme="light"\][\s\S]*?--text:/);
  });
});
