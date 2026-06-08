export const STATE_FIELDS = [
  "player",
  "foe",
  "foeOrder",
  "foeQueue",
  "deferredFoeIds",
  "turn",
  "wave",
  "hypeLevel",
  "foeHypeLevel",
  "phase",
  "combatHints",
  "pendingHeroEmoji",
  "pendingHeroLabel",
  "heroColorTheme",
  "pendingHeroColorTheme",
  "foeColorTheme",
  "lastFoeColorTheme",
  "defeatVerbIndex",
  "combatBusy",
  "combatActionGeneration",
  "awaitingFoeResponse",
  "suppressFoePanelRender",
  "displayedPlayerHype",
  "displayedFoeHype",
  "skipPlayerHypeTeachThisRender",
  "suppressTeachFlashesThisRender",
  "temporarilyClosedTeachPopups",
  "setupHintForced",
  "setupColorPickerBound",
  "waveAttempt",
  "battleLogHistory",
  "currentColorMode",
  "debugInstantTransitions",
  "confirmResolve",
  "footerTeachPopupResizeBound",
];

const SKIP_PREFIXES = {
  player: ["Level", "Stats", "Attack", "Power", "Name", "Panel", "Hp", "Buff", "Hype", "Emoji"],
};

export function preprocessShadowLocals(body) {
  return body
    .replace(
      /const player = tryCelebrateFirstPlayerHype\(combatHints, hypeLevel\);\s*\n\s*combatHints = player\.flags;\s*\n\s*if \(player\.flashFirstHype\)/,
      `const playerHypeResult = tryCelebrateFirstPlayerHype(combatHints, hypeLevel);
    combatHints = playerHypeResult.flags;
    if (playerHypeResult.flashFirstHype)`
    )
    .replace(
      /const foe = tryCelebrateFirstFoeHype\(combatHints, foeHypeLevel\);\s*\n\s*combatHints = foe\.flags;\s*\n\s*if \(foe\.flashFirstHype\)/,
      `const foeHypeResult = tryCelebrateFirstFoeHype(combatHints, foeHypeLevel);
    combatHints = foeHypeResult.flags;
    if (foeHypeResult.flashFirstHype)`
    )
    .replace(
      /function normalizeSnapshot\(snap: GameSnapshot\): GameSnapshot \{\s*\n\s*const wave = sanitizeWave\(snap\.wave, CAMPAIGN_WAVES\);/,
      `function normalizeSnapshot(snap: GameSnapshot): GameSnapshot {
  const snapWave = sanitizeWave(snap.wave, CAMPAIGN_WAVES);`
    )
    .replace(
      /const player = sanitizeSnapshotPlayer\(/g,
      "const snapPlayer = sanitizeSnapshotPlayer("
    )
    .replace(
      /(snapPlayer = sanitizeSnapshotPlayer\(\s*\n\s*snap\.player,\s*\n\s*)wave,/,
      "$1snapWave,"
    )
    .replace(
      /(function normalizeSnapshot[\s\S]*?return \{\s*\n\s*)player,/,
      "$1player: snapPlayer,"
    )
    .replace(
      /(function normalizeSnapshot[\s\S]*?turn: sanitizeTurn\(snap\.turn\),\s*\n\s*)wave,/,
      "$1wave: snapWave,"
    )
    .replace(
      /(function normalizeSnapshot[\s\S]*?turn: sanitizeTurn\(snap\.turn\),\s*\n\s*)wave: gameState\.wave,/,
      "$1wave: snapWave,"
    )
    .replace(
      /(function normalizeSnapshot[\s\S]*?\? sanitizeSnapshotFoe\(legacyFoe, )wave(, FOES_BY_ID\))/,
      "$1snapWave$2"
    )
    .replace(
      /const wave = clampInt\(record\.wave, 1, CAMPAIGN_WAVES, 1\);/g,
      "const entryWave = clampInt(record.wave, 1, CAMPAIGN_WAVES, 1);"
    )
    .replace(/\? \{ wave, attempt \}/g, "? { wave: entryWave, attempt }")
    .replace(
      /FOES\.map\(\(foe\) => foe\.emoji\)/g,
      "FOES.map((f) => f.emoji)"
    );
}

function expandShorthands(code) {
  let out = code;
  for (const field of STATE_FIELDS) {
    out = out.replace(
      new RegExp(`(?<!\\$)({\\s*)${field}(\\s*,)`, "g"),
      `$1${field}: gameState.${field}$2`
    );
    out = out.replace(
      new RegExp(`(?<!\\$)({\\s*)${field}(\\s*})`, "g"),
      `$1${field}: gameState.${field}$2`
    );
  }
  return out;
}

function bindFieldOnLine(field, line) {
  if (/^\s*\/\//.test(line)) {
    return line;
  }
  const skip = SKIP_PREFIXES[field] ?? [];
  const re = new RegExp(`(?<![.\\w])${field}\\b`, "g");
  return line.replace(re, (match, offset, whole) => {
    const before = whole.slice(0, offset);
    const after = whole.slice(offset + match.length);
    for (const suffix of skip) {
      if (after.startsWith(suffix)) return match;
    }
    if (/["']$/.test(before.slice(-1)) && /^["']/.test(after)) return match;
    if (/^\s*:/.test(after) && !/\?\s*$/.test(before)) return match;
    if (/(?:const|let)\s+$/.test(before)) return match;
    if (/for\s*\(\s*(?:const|let)?\s*$/.test(before)) return match;
    if (/\(\s*$/.test(before) && /^\s*\)\s*=>/.test(after)) return match;
    if (before.slice(-1) === "-") return match;
    if (after.startsWith("-")) return match;
    return `gameState.${field}`;
  });
}

function bindFieldOutsideStrings(field, line) {
  return line
    .split(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g)
    .map((part, index) => (index % 2 === 1 ? part : bindFieldOnLine(field, part)))
    .join("");
}

function bindField(field, code) {
  return code
    .split("\n")
    .map((line) => bindFieldOutsideStrings(field, line))
    .join("\n");
}

function isObjectLiteralBrace(before) {
  const trimmed = before.trimEnd();
  return /[:?=({,]$/.test(trimmed) || /\breturn\s*$/.test(trimmed);
}

function fixBrokenShorthands(code) {
  let out = code.replace(
    /\{\s*gameState\.([a-zA-Z0-9_]+),/g,
    "{ $1: gameState.$1,"
  );
  const lines = out.split("\n");
  const braceStack = [];
  out = lines
    .map((line) => {
      if (/^function \w/.test(line)) {
        braceStack.length = 0;
      }
      const match = line.match(/^(\s+)gameState\.([a-zA-Z0-9_]+),(\s*)$/);
      let nextLine = line;
      if (match && braceStack.some((entry) => entry === "obj")) {
        nextLine = `${match[1]}${match[2]}: gameState.${match[2]},${match[3]}`;
      }
      for (let index = 0; index < line.length; index += 1) {
        if (line[index] === "$" && line[index + 1] === "{") {
          index += 1;
          continue;
        }
        if (line[index] !== "{" && line[index] !== "}") {
          continue;
        }
        if (line[index] === "{") {
          braceStack.push(
            isObjectLiteralBrace(line.slice(0, index)) ? "obj" : "block"
          );
        } else if (braceStack.length > 0) {
          braceStack.pop();
        }
      }
      return nextLine;
    })
    .join("\n");
  return out;
}

function fixSpreads(code) {
  let out = code;
  for (const field of STATE_FIELDS) {
    out = out.replace(
      new RegExp(`\\.\\.\\.${field}\\b`, "g"),
      `...gameState.${field}`
    );
  }
  return out;
}

function replaceLinePreserving(code, pattern, replacer) {
  return code.replace(pattern, (match) => {
    const lineCount = match.split("\n").length;
    const replacement =
      typeof replacer === "function" ? replacer(match) : replacer;
    const replacementLines = replacement.split("\n");
    if (replacementLines.length !== lineCount) {
      throw new Error(
        `Line-preserving replace expected ${lineCount} lines, got ${replacementLines.length}`
      );
    }
    return replacement;
  });
}

function commentOutStateDeclarations(body) {
  let out = body;
  out = replaceLinePreserving(
    out,
    /^const player: Player = \{[\s\S]*?\};\n\n/m,
    (match) =>
      match
        .split("\n")
        .map(() => "// state.ts: gameState.player")
        .join("\n")
  );
  out = out.replace(/^let confirmResolve:[^\n]+\n\n/m, "// state.ts: gameState.confirmResolve\n\n");
  out = out.replace(/^let currentColorMode:[^\n]+\n/m, "// state.ts: gameState.currentColorMode\n");
  out = out.replace(
    /^let debugInstantTransitions = false;\n\n/m,
    "// state.ts: gameState.debugInstantTransitions\n\n"
  );
  for (const name of STATE_FIELDS) {
    if (name === "player") continue;
    out = out.replace(
      new RegExp(`^let ${name}[^\\n]+\\n`, "gm"),
      `// state.ts: gameState.${name}\n`
    );
    out = out.replace(
      new RegExp(`^const ${name}[^\\n]+\\n`, "gm"),
      `// state.ts: gameState.${name}\n`
    );
  }
  return out;
}

function fixMisboundTemplateLiterals(code) {
  return code.replace(/`([^`\\]|\\.)*`/g, (template) => {
    let out = "`";
    let index = 1;
    while (index < template.length - 1) {
      if (template[index] === "$" && template[index + 1] === "{") {
        let end = index + 2;
        while (end < template.length && template[end] !== "}") {
          end += 1;
        }
        out += template.slice(index, end + 1);
        index = end + 1;
        continue;
      }
      const nextExpr = template.indexOf("${", index);
      const end = nextExpr === -1 ? template.length - 1 : nextExpr;
      out += template
        .slice(index, end)
        .replace(/gameState\.([a-zA-Z0-9_]+)/g, "$1");
      index = end;
    }
    out += "`";
    return out;
  });
}

export function bindStateBody(body) {
  let out = preprocessShadowLocals(body);
  out = commentOutStateDeclarations(out);
  out = expandShorthands(out);
  for (const field of STATE_FIELDS) {
    out = bindField(field, out);
  }
  out = fixBrokenShorthands(out);
  out = fixSpreads(out);
  out = fixMisboundTemplateLiterals(out);
  out = out.replace(
    /(function normalizeSnapshot[\s\S]*?turn: sanitizeTurn\(snap\.turn\),\s*\n\s*)wave: gameState\.wave,/,
    "$1wave: snapWave,"
  );
  return out;
}

export function fixImportPaths(code) {
  return code
    .replace(/from "\.\/lib\//g, 'from "../lib/')
    .replace(/from "\.\/content\//g, 'from "../content/')
    .replace(/from "\.\/ui\//g, 'from "../ui/')
    .replace(/from "\.\/game\/data\.js"/g, 'from "./data.js"')
    .replace(/from "\.\/game\/dom\.js"/g, 'from "./dom.js"')
    .replace(/from "\.\/game\/constants\.js"/g, 'from "./constants.js"')
    .replace(/from "\.\/game\/types\.js"/g, 'from "./types.js"');
}

export function findFunctionLine(lines, name) {
  const idx = lines.findIndex((line) =>
    new RegExp(`^function ${name}\\(`).test(line)
  );
  if (idx < 0) {
    throw new Error(`function ${name} not found`);
  }
  return idx + 1;
}

export function sliceFunctionBlock(lines, name, endBeforeName) {
  const start = findFunctionLine(lines, name);
  const end = endBeforeName
    ? findFunctionLine(lines, endBeforeName) - 1
    : lines.length;
  return lines.slice(start - 1, end).join("\n");
}
