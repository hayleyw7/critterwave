/**
 * Assemble index.html from html/index.template.html and html/partials/*.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const htmlDir = path.join(root, "html");
const templatePath = path.join(htmlDir, "index.template.html");
const outputPath = path.join(root, "index.html");
const includeRe = /<!--\s*@include\s+([^\s]+)\s*-->/g;

function resolveIncludes(content) {
  return content.replace(includeRe, (_, relPath) => {
    const filePath = path.join(htmlDir, relPath);
    if (!fs.existsSync(filePath)) {
      throw new Error(`HTML partial not found: ${relPath}`);
    }
    const partial = fs.readFileSync(filePath, "utf8").trimEnd();
    return resolveIncludes(partial);
  });
}

if (!fs.existsSync(templatePath)) {
  throw new Error(`Missing template: ${templatePath}`);
}

const template = fs.readFileSync(templatePath, "utf8");
let output = resolveIncludes(template);
output = injectGameScriptCacheBust(output);
fs.writeFileSync(outputPath, output);

function injectGameScriptCacheBust(html) {
  const gameJsPath = path.join(root, "js/game.js");
  const version = fs.existsSync(gameJsPath)
    ? Math.floor(fs.statSync(gameJsPath).mtimeMs)
    : Date.now();
  return html.replace(
    /src="js\/game\.js(?:\?v=\d+)?"/,
    `src="js/game.js?v=${version}"`
  );
}
