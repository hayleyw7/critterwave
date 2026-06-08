import { describe, expect, it } from "vitest";
import { readCssModule } from "./bundle.js";

describe("css/utilities.css", () => {
  const utilities = readCssModule("utilities.css");

  it("defines the global hidden helper", () => {
    expect(utilities).toMatch(/\.hidden\s*\{[^}]*display:\s*none\s*!important/);
  });

  it("disables motion-heavy animations when reduced motion is requested", () => {
    expect(utilities).toContain("@media (prefers-reduced-motion: reduce)");
    expect(utilities).toContain(".command-menu .cmd.cmd-hint-flash");
  });
});
