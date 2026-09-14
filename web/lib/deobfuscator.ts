// Prometheus Deobfuscator logic — ported to TypeScript for Vercel
// This implements the core deobfuscation logic from deobfuscator.py

export interface DeobfResult {
  success: boolean;
  output: string;
  constants?: string;
  trace?: string[];
  error?: string;
}

// Compound assignment operators (Luau compat)
const COMPOUND_OPS = ['+=', '-=', '*=', '/=', '%=', '..='];

function findTableLiteralEnd(content: string, openBraceIndex: number): number {
  let depth = 0;
  let quote: string | null = null;
  let idx = openBraceIndex;

  while (idx < content.length) {
    const char = content[idx];
    if (quote) {
      if (char === '\\') { idx += 2; continue; }
      if (char === quote) quote = null;
      idx++;
      continue;
    }
    if (char === "'" || char === '"') quote = char;
    else if (char === '{') depth++;
    else if (char === '}') {
      depth--;
      if (depth === 0) return idx + 1;
    }
    idx++;
  }
  return -1;
}

function findCompoundLhsStart(content: string, opIdx: number): number {
  let idx = opIdx - 1;
  while (idx >= 0 && /\s/.test(content[idx])) idx--;
  while (idx >= 0 && content[idx] === ']') {
    let depth = 1; idx--;
    while (idx >= 0 && depth > 0) {
      if (content[idx] === ']') depth++;
      else if (content[idx] === '[') depth--;
      idx--;
    }
  }
  while (idx >= 0 && /[a-zA-Z0-9_]/.test(content[idx])) idx--;
  while (idx >= 0 && content[idx] === '.') {
    idx--;
    while (idx >= 0 && content[idx] === ']') {
      let depth = 1; idx--;
      while (idx >= 0 && depth > 0) {
        if (content[idx] === ']') depth++;
        else if (content[idx] === '[') depth--;
        idx--;
      }
    }
    while (idx >= 0 && /[a-zA-Z0-9_]/.test(content[idx])) idx--;
  }
  return idx + 1;
}

function findCompoundRhsEnd(content: string, rhsStart: number): number {
  let idx = rhsStart;
  const length = content.length;
  let bracketDepth = 0, parenDepth = 0, braceDepth = 0;
  let quote: string | null = null;

  while (idx < length && /\s/.test(content[idx])) idx++;
  while (idx < length) {
    const char = content[idx];
    if (quote) {
      if (char === '\\') { idx += 2; continue; }
      if (char === quote) quote = null;
      idx++; continue;
    }
    if (char === '"' || char === "'") { quote = char; idx++; continue; }
    if (char === '[') bracketDepth++;
    else if (char === ']') bracketDepth = Math.max(0, bracketDepth - 1);
    else if (char === '(') parenDepth++;
    else if (char === ')') {
      if (parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) break;
      parenDepth = Math.max(0, parenDepth - 1);
    } else if (char === '{') braceDepth++;
    else if (char === '}') {
      if (braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) break;
      braceDepth = Math.max(0, braceDepth - 1);
    } else if (bracketDepth === 0 && parenDepth === 0 && braceDepth === 0) {
      if (';,\n\r'.includes(char) || /\s/.test(char)) break;
    }
    idx++;
  }
  return idx;
}

export function normalizeLuauSyntax(content: string): string {
  const replacements: Array<[number, number, string]> = [];
  let idx = 0;

  while (idx < content.length) {
    let matchedOp: string | null = null;
    for (const op of COMPOUND_OPS) {
      if (content.startsWith(op, idx)) { matchedOp = op; break; }
    }
    if (!matchedOp) { idx++; continue; }

    const lhsStart = findCompoundLhsStart(content, idx);
    const rhsStart = idx + matchedOp.length;
    const rhsEnd = findCompoundRhsEnd(content, rhsStart);

    const lhs = content.slice(lhsStart, idx).trim();
    const rhs = content.slice(rhsStart, rhsEnd).trim();
    if (lhs && rhs) {
      const baseOp = matchedOp.slice(0, -1);
      replacements.push([lhsStart, rhsEnd, `${lhs} = ${lhs} ${baseOp} ${rhs}`]);
    }
    idx = rhsEnd;
  }

  if (replacements.length === 0) return content;
  let rewritten = content;
  for (const [start, end, replacement] of [...replacements].reverse()) {
    rewritten = rewritten.slice(0, start) + replacement + rewritten.slice(end);
  }
  return rewritten;
}

// Extract string table variable from obfuscated code
export function extractStringTableVar(content: string): string | null {
  const match = content.match(/local ([a-zA-Z0-9_]+)=\{"/);
  return match ? match[1] : null;
}

// Simple in-memory string constant extractor
// Parses the literal string table without running Lua
export function extractStringConstants(content: string, varName: string): Record<number, string> | null {
  const tableMatch = new RegExp(`\\blocal\\s+${escapeRegex(varName)}\\s*=\\s*\\{`).exec(content);
  if (!tableMatch) return null;

  const openBraceIndex = content.indexOf('{', tableMatch.index);
  const tableEnd = findTableLiteralEnd(content, openBraceIndex);
  if (tableEnd === -1) return null;

  const tableStr = content.slice(openBraceIndex + 1, tableEnd - 1);
  const constants: Record<number, string> = {};

  // Parse quoted strings from the table literal
  let i = 0;
  let idx = 0;
  const len = tableStr.length;

  while (i < len) {
    if (tableStr[i] === '"' || tableStr[i] === "'") {
      const q = tableStr[i];
      let j = i + 1;
      let str = '';
      while (j < len) {
        if (tableStr[j] === '\\') {
          const next = tableStr[j + 1];
          if (next === 'n') str += '\n';
          else if (next === 't') str += '\t';
          else if (next === 'r') str += '\r';
          else if (next === '\\') str += '\\';
          else if (next === '"') str += '"';
          else if (next === "'") str += "'";
          else if (/[0-9]/.test(next)) {
            let numStr = '';
            let k = j + 1;
            while (k < len && /[0-9]/.test(tableStr[k]) && numStr.length < 3) {
              numStr += tableStr[k]; k++;
            }
            str += String.fromCharCode(parseInt(numStr, 10));
            j = k - 1;
          } else str += next;
          j += 2; continue;
        }
        if (tableStr[j] === q) { j++; break; }
        str += tableStr[j]; j++;
      }
      idx++;
      constants[idx] = str;
      i = j;
    } else {
      i++;
    }
  }

  return constants;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Main deobfuscation function — works client-side in JS
// Does string constant substitution and pattern cleanup
export function deobfuscate(rawCode: string): DeobfResult {
  try {
    let content = normalizeLuauSyntax(rawCode);
    const varName = extractStringTableVar(content);

    if (!varName) {
      // Try generic cleanup — format + pretty print
      return {
        success: true,
        output: prettyPrint(content),
        error: 'No obfuscated string table found. Showing formatted code.',
      };
    }

    const constants = extractStringConstants(content, varName);
    let constantsStr = '';
    if (constants) {
      constantsStr = `local Constants = {\n`;
      for (const [k, v] of Object.entries(constants)) {
        constantsStr += `  [${k}] = ${JSON.stringify(v)},\n`;
      }
      constantsStr += `}\n`;
    }

    // Substitute string table references
    if (constants) {
      // Replace patterns like varName[N] with the actual string
      content = content.replace(
        new RegExp(`${escapeRegex(varName)}\\[(\\d+)\\]`, 'g'),
        (_, idx) => {
          const str = constants[parseInt(idx)];
          return str !== undefined ? JSON.stringify(str) : _;
        }
      );
    }

    // Remove the original string table declaration
    const tableMatch = new RegExp(`local\\s+${escapeRegex(varName)}\\s*=\\s*\\{`).exec(content);
    if (tableMatch) {
      const openBrace = content.indexOf('{', tableMatch.index);
      const tableEnd = findTableLiteralEnd(content, openBrace);
      if (tableEnd !== -1) {
        content = content.slice(0, tableMatch.index) + content.slice(tableEnd);
      }
    }

    const deobfOutput = [
      `-- ✅ Deobfuscated by Prometheus Deobfuscator Web`,
      `-- Original string table variable: ${varName}`,
      `-- Constants extracted: ${constants ? Object.keys(constants).length : 0}`,
      ``,
      constantsStr,
      prettyPrint(content.trim()),
    ].join('\n');

    return {
      success: true,
      output: deobfOutput,
      constants: constantsStr,
      trace: [],
    };
  } catch (err) {
    return {
      success: false,
      output: '',
      error: String(err),
    };
  }
}

// Basic Lua code prettifier
function prettyPrint(code: string): string {
  const lines = code.split('\n');
  let indent = 0;
  const indentStr = '    ';
  const increaseAfter = /\b(do|then|else|function|repeat)\s*$/;
  const decreaseBefore = /^\s*(end|else|elseif|until)\b/;

  return lines
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';

      if (decreaseBefore.test(trimmed)) indent = Math.max(0, indent - 1);
      const result = indentStr.repeat(indent) + trimmed;
      if (increaseAfter.test(trimmed) && !trimmed.startsWith('--')) indent++;
      // Also increase after "do" at end of for/while
      if (/^\s*(for|while|if)\b/.test(trimmed) && !trimmed.includes('then') && !trimmed.includes('do')) {
        // multi-line for/while — don't adjust yet
      }
      return result;
    })
    .join('\n');
}
