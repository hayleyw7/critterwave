import { describe, expect, it } from "vitest";
import { escapeHtml } from "../src/lib/escape-html.js";

describe("escapeHtml", () => {
  it("escapes HTML metacharacters", () => {
    expect(escapeHtml(`Tom & "Jerry" <script>'`)).toBe(
      "Tom &amp; &quot;Jerry&quot; &lt;script&gt;&#39;"
    );
  });

  it("passes through safe plain text", () => {
    expect(escapeHtml("Pat the Cat")).toBe("Pat the Cat");
    expect(escapeHtml("")).toBe("");
  });

  it("escapes ampersands before other replacements", () => {
    expect(escapeHtml("AT&T")).toBe("AT&amp;T");
    expect(escapeHtml("&lt;already&gt;")).toBe("&amp;lt;already&amp;gt;");
  });

  it("escapes attribute-breakout attempts", () => {
    expect(escapeHtml(`"><script>alert(1)</script>`)).toBe(
      "&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;"
    );
  });
});
