// Lua Syntax Highlighter — tokenizer and HTML renderer

export type TokenType =
  | 'keyword'
  | 'keyword-control'
  | 'string'
  | 'number'
  | 'comment'
  | 'function'
  | 'builtin'
  | 'builtin-table'
  | 'operator'
  | 'punctuation'
  | 'identifier'
  | 'boolean'
  | 'nil'
  | 'vararg'
  | 'table-field'
  | 'whitespace'
  | 'unknown';

export interface Token {
  type: TokenType;
  value: string;
}

// Lua 5.1/5.4 keywords
const KEYWORDS = new Set([
  'and', 'break', 'do', 'else', 'elseif', 'end',
  'false', 'for', 'function', 'goto', 'if', 'in',
  'local', 'nil', 'not', 'or', 'repeat', 'return',
  'then', 'true', 'until', 'while',
]);

const KEYWORD_CONTROL = new Set([
  'if', 'else', 'elseif', 'then', 'end', 'do', 'while',
  'for', 'repeat', 'until', 'return', 'break', 'goto', 'in',
]);

const BOOLEAN_NIL = new Set(['true', 'false', 'nil']);

// Lua standard library builtins
const BUILTINS = new Set([
  'print', 'type', 'tostring', 'tonumber', 'error', 'assert',
  'pcall', 'xpcall', 'pairs', 'ipairs', 'next', 'select',
  'rawget', 'rawset', 'rawequal', 'rawlen',
  'setmetatable', 'getmetatable',
  'load', 'loadstring', 'loadfile', 'dofile',
  'collectgarbage', 'require',
  'unpack', 'table.unpack',
  'coroutine.create', 'coroutine.resume', 'coroutine.yield',
  'coroutine.wrap', 'coroutine.status', 'coroutine.running',
  'coroutine.isyieldable',
]);

// Lua standard table namespaces
const BUILTIN_TABLES = new Set([
  'string', 'table', 'math', 'io', 'os', 'file', 'debug',
  'coroutine', 'package', 'bit', 'bit32', 'utf8',
  'game', 'workspace', 'script',
]);

// Common Lua methods
const BUILTIN_METHODS = new Set([
  // string
  'format', 'len', 'sub', 'rep', 'reverse', 'upper', 'lower',
  'byte', 'char', 'find', 'match', 'gmatch', 'gsub', 'dump',
  // table
  'insert', 'remove', 'sort', 'concat', 'move',
  // math
  'abs', 'ceil', 'floor', 'sqrt', 'sin', 'cos', 'tan',
  'max', 'min', 'fmod', 'modf', 'huge', 'pi', 'random',
  'randomseed', 'log', 'exp', 'pow',
  // io/os
  'open', 'close', 'read', 'write', 'clock', 'time', 'date', 'exit',
]);

const OPERATORS = new Set([
  '+', '-', '*', '/', '%', '^', '#',
  '&', '|', '~', '<<', '>>',
  '==', '~=', '<', '>', '<=', '>=',
  '=', '..', '...',
  'and', 'or', 'not',
]);

// CSS color map for token types
export const TOKEN_COLORS: Record<TokenType, string> = {
  keyword: '#ff7b72',
  'keyword-control': '#f47067',
  string: '#a5d6ff',
  number: '#79c0ff',
  comment: '#8b949e',
  function: '#d2a8ff',
  builtin: '#ffa657',
  'builtin-table': '#7ee787',
  operator: '#ff7b72',
  punctuation: '#c9d1d9',
  identifier: '#c9d1d9',
  boolean: '#79c0ff',
  nil: '#79c0ff',
  vararg: '#ffa657',
  'table-field': '#7ee787',
  whitespace: 'transparent',
  unknown: '#c9d1d9',
};

export function tokenize(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < code.length) {
    // Long string / comment [[ ... ]]
    if (code[i] === '[') {
      let level = 0;
      let j = i + 1;
      while (j < code.length && code[j] === '=') { level++; j++; }
      if (j < code.length && code[j] === '[') {
        const closePattern = ']' + '='.repeat(level) + ']';
        const end = code.indexOf(closePattern, j + 1);
        if (end !== -1) {
          const raw = code.slice(i, end + closePattern.length);
          tokens.push({ type: 'string', value: raw });
          i = end + closePattern.length;
          continue;
        }
      }
    }

    // Long comment --[[ ... ]]
    if (code[i] === '-' && code[i + 1] === '-') {
      let j = i + 2;
      let level = 0;
      if (code[j] === '[') {
        j++;
        while (j < code.length && code[j] === '=') { level++; j++; }
        if (j < code.length && code[j] === '[') {
          const closePattern = ']' + '='.repeat(level) + ']';
          const end = code.indexOf(closePattern, j + 1);
          if (end !== -1) {
            tokens.push({ type: 'comment', value: code.slice(i, end + closePattern.length) });
            i = end + closePattern.length;
            continue;
          }
        }
      }
      // Single line comment
      let end = code.indexOf('\n', i);
      if (end === -1) end = code.length;
      tokens.push({ type: 'comment', value: code.slice(i, end) });
      i = end;
      continue;
    }

    // String: single or double quote
    if (code[i] === '"' || code[i] === "'") {
      const quote = code[i];
      let j = i + 1;
      while (j < code.length) {
        if (code[j] === '\\') { j += 2; continue; }
        if (code[j] === quote) { j++; break; }
        j++;
      }
      tokens.push({ type: 'string', value: code.slice(i, j) });
      i = j;
      continue;
    }

    // Number
    if (/[0-9]/.test(code[i]) || (code[i] === '.' && /[0-9]/.test(code[i + 1] ?? ''))) {
      let j = i;
      // Hex
      if (code[j] === '0' && (code[j + 1] === 'x' || code[j + 1] === 'X')) {
        j += 2;
        while (j < code.length && /[0-9a-fA-F_]/.test(code[j])) j++;
      } else {
        while (j < code.length && /[0-9_]/.test(code[j])) j++;
        if (j < code.length && code[j] === '.') {
          j++;
          while (j < code.length && /[0-9_]/.test(code[j])) j++;
        }
        if (j < code.length && (code[j] === 'e' || code[j] === 'E')) {
          j++;
          if (j < code.length && (code[j] === '+' || code[j] === '-')) j++;
          while (j < code.length && /[0-9]/.test(code[j])) j++;
        }
      }
      tokens.push({ type: 'number', value: code.slice(i, j) });
      i = j;
      continue;
    }

    // Identifier or keyword
    if (/[a-zA-Z_]/.test(code[i])) {
      let j = i;
      while (j < code.length && /[a-zA-Z0-9_]/.test(code[j])) j++;
      const word = code.slice(i, j);

      // Check if next non-space char is '(' — function call
      let k = j;
      while (k < code.length && code[k] === ' ') k++;
      const isCall = code[k] === '(' || code[k] === '"' || code[k] === "'";

      if (BOOLEAN_NIL.has(word)) {
        tokens.push({ type: word === 'nil' ? 'nil' : 'boolean', value: word });
      } else if (KEYWORD_CONTROL.has(word)) {
        tokens.push({ type: 'keyword-control', value: word });
      } else if (KEYWORDS.has(word)) {
        tokens.push({ type: 'keyword', value: word });
      } else if (BUILTIN_TABLES.has(word)) {
        tokens.push({ type: 'builtin-table', value: word });
      } else if (BUILTINS.has(word)) {
        tokens.push({ type: 'builtin', value: word });
      } else if (word === '...') {
        tokens.push({ type: 'vararg', value: word });
      } else if (isCall) {
        tokens.push({ type: 'function', value: word });
      } else {
        tokens.push({ type: 'identifier', value: word });
      }
      i = j;
      continue;
    }

    // Multi-char operators
    const two = code.slice(i, i + 2);
    if (['==', '~=', '<=', '>=', '..', '//'].includes(two)) {
      tokens.push({ type: 'operator', value: two });
      i += 2;
      continue;
    }

    // Single char operators / punctuation
    if ('+-*/%^#&|~<>='.includes(code[i])) {
      tokens.push({ type: 'operator', value: code[i] });
      i++;
      continue;
    }

    if ('(){}[],.;:'.includes(code[i])) {
      tokens.push({ type: 'punctuation', value: code[i] });
      i++;
      continue;
    }

    // Whitespace
    if (/\s/.test(code[i])) {
      let j = i;
      // Don't lump newlines — preserve them for line counting
      if (code[i] === '\n') {
        tokens.push({ type: 'whitespace', value: '\n' });
        i++;
      } else {
        while (j < code.length && code[j] !== '\n' && /\s/.test(code[j])) j++;
        tokens.push({ type: 'whitespace', value: code.slice(i, j) });
        i = j;
      }
      continue;
    }

    tokens.push({ type: 'unknown', value: code[i] });
    i++;
  }

  return tokens;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function tokenizeToHtml(code: string): string {
  const tokens = tokenize(code);
  return tokens
    .map(tok => {
      const escaped = escapeHtml(tok.value);
      if (tok.type === 'whitespace') return escaped;
      const color = TOKEN_COLORS[tok.type] ?? '#c9d1d9';
      const extra = tok.type === 'function' ? 'font-style:italic;' : '';
      const bold = (tok.type === 'keyword' || tok.type === 'keyword-control') ? 'font-weight:600;' : '';
      return `<span style="color:${color};${bold}${extra}">${escaped}</span>`;
    })
    .join('');
}
