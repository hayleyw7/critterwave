import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { describe, expect, it } from "vitest";
import { readHtmlPartial } from "../html/bundle.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("html/partials/head.html — security headers", () => {
  const head = readHtmlPartial("head.html");

  it("sets a strict Content-Security-Policy", () => {
    expect(head).toContain('http-equiv="Content-Security-Policy"');
    expect(head).toContain("default-src 'self'");
    expect(head).toContain("script-src 'self'");
    expect(head).toContain("frame-ancestors 'none'");
  });

  it("sets referrer and permissions policies", () => {
    expect(head).toContain('name="referrer" content="strict-origin-when-cross-origin"');
    expect(head).toContain("Permissions-Policy");
    expect(head).toContain("camera=()");
  });

  it("does not load third-party fonts", () => {
    expect(head).not.toContain("fonts.googleapis.com");
    expect(head).not.toContain("fonts.gstatic.com");
  });
});

describe("html assembly — script entry", () => {
  it("loads only same-origin script module", () => {
    const html = readFileSync(join(root, "index.html"), "utf8");
    expect(html).toMatch(/<script type="module" src="js\/game\.js(?:\?v=\d+)?">/);
    expect(html).not.toMatch(/<script[^>]*src=["']https?:/);
  });

  it("loads theme-boot as a same-origin classic script before the module entry", () => {
    const html = readFileSync(join(root, "index.html"), "utf8");
    expect(html).toContain('<script src="assets/theme-boot.js"></script>');
    expect(html).toContain("script-src 'self'");
    expect(html.indexOf("theme-boot.js")).toBeLessThan(html.search(/src="js\/game\.js/));
  });
});
