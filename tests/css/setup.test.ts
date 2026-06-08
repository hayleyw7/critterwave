import { describe, expect, it } from "vitest";
import { readCssModule } from "./bundle.js";

describe("css/setup.css", () => {
  const setup = readCssModule("setup.css");

  it("defines setup name teach pulse animation", () => {
    expect(setup).toContain(".setup-name-input.setup-name-teach-flash");
    expect(setup).toContain("@keyframes setup-name-teach-pulse");
  });
});
