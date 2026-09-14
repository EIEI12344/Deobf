// Lua 5.1 / Luau Syntax Highlighter

const KEYWORDS_CONTROL = new Set([
  'if','else','elseif','then','end','do','while',
  'for','repeat','until','return','break','goto','in',
])

const KEYWORDS_OTHER = new Set([
  'local','function','and','or','not',
])

const LITERALS = new Set(['true','false','nil'])

const BUILTINS = new Set([
  'print','type','tostring','tonumber','error','assert',
  'pcall','xpcall','pairs','ipairs','next','select',
  'rawget','rawset','rawequal','rawlen',
  'setmetatable','getmetatable','require',
  'unpack','load','loadstring','loadfile','dofile',
  'collectgarbage','getfenv','setfenv',
])

const STD_TABLES = new Set([
  'string','table','math','io','os','debug',
  'coroutine','package','bit','bit32','utf8',
  'game','workspace','script','_G','shared',
])

// Token CSS colors
const C = {
  ctrl:    '#f47067',
  kw:      '#ff7b72',
  lit:     '#79c0ff',
  str:     '#a5d6ff',
  num:     '#79c0ff',
  comment: '#8b949e',
  fn:      '#d2a8ff',
  builtin: '#ffa657',
  std:     '#7ee787',
  op:      '#ff7b72',
  punct:   '#c9d1d9',
  plain:   '#c9d1d9',
}

function esc(s: string): string {
  return s
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
}

function span(color: string, text: string, italic = false): string {
  const style = `color:${color}${italic ? ';font-style:italic' : ''}`
  return `<span style="${style}">${esc(text)}</span>`
}

export function tokenizeToHtml(code: string): string {
  let out = ''
  let i = 0
  const n = code.length

  while (i < n) {
    // Long comment --[[ ]]
    if (code[i] === '-' && code[i+1] === '-') {
      // check long bracket
      let j = i + 2
      let level = 0
      if (code[j] === '[') {
        j++
        while (j < n && code[j] === '=') { level++; j++ }
        if (code[j] === '[') {
          const close = ']' + '='.repeat(level) + ']'
          const end = code.indexOf(close, j + 1)
          if (end !== -1) {
            out += span(C.comment, code.slice(i, end + close.length))
            i = end + close.length
            continue
          }
        }
      }
      // single line comment
      let end = code.indexOf('\n', i)
      if (end === -1) end = n
      out += span(C.comment, code.slice(i, end))
      i = end
      continue
    }

    // Long string [[ ]]
    if (code[i] === '[') {
      let j = i + 1
      let level = 0
      while (j < n && code[j] === '=') { level++; j++ }
      if (j < n && code[j] === '[') {
        const close = ']' + '='.repeat(level) + ']'
        const end = code.indexOf(close, j + 1)
        if (end !== -1) {
          out += span(C.str, code.slice(i, end + close.length))
          i = end + close.length
          continue
        }
      }
    }

    // String " or '
    if (code[i] === '"' || code[i] === "'") {
      const q = code[i]
      let j = i + 1
      while (j < n) {
        if (code[j] === '\\') { j += 2; continue }
        if (code[j] === q) { j++; break }
        j++
      }
      out += span(C.str, code.slice(i, j))
      i = j
      continue
    }

    // Number: 0x hex or decimal
    if (/[0-9]/.test(code[i]) || (code[i] === '.' && i+1 < n && /[0-9]/.test(code[i+1]))) {
      let j = i
      if (code[j] === '0' && i+1 < n && (code[j+1] === 'x' || code[j+1] === 'X')) {
        j += 2
        while (j < n && /[0-9a-fA-F]/.test(code[j])) j++
      } else {
        while (j < n && /[0-9]/.test(code[j])) j++
        if (j < n && code[j] === '.') {
          j++
          while (j < n && /[0-9]/.test(code[j])) j++
        }
        if (j < n && (code[j] === 'e' || code[j] === 'E')) {
          j++
          if (j < n && (code[j] === '+' || code[j] === '-')) j++
          while (j < n && /[0-9]/.test(code[j])) j++
        }
      }
      out += span(C.num, code.slice(i, j))
      i = j
      continue
    }

    // Identifier / keyword
    if (/[a-zA-Z_]/.test(code[i])) {
      let j = i
      while (j < n && /[a-zA-Z0-9_]/.test(code[j])) j++
      const word = code.slice(i, j)

      // peek ahead: is next non-space a '('?
      let k = j
      while (k < n && code[k] === ' ') k++
      const nextIsCall = k < n && (code[k] === '(' || code[k] === '"' || code[k] === "'")

      if (KEYWORDS_CONTROL.has(word)) {
        out += span(C.ctrl, word)
      } else if (KEYWORDS_OTHER.has(word)) {
        out += span(C.kw, word)
      } else if (LITERALS.has(word)) {
        out += span(C.lit, word)
      } else if (STD_TABLES.has(word)) {
        out += span(C.std, word)
      } else if (BUILTINS.has(word)) {
        out += span(C.builtin, word)
      } else if (nextIsCall) {
        out += span(C.fn, word, true)
      } else {
        out += span(C.plain, word)
      }
      i = j
      continue
    }

    // 2-char operators
    const two = code.slice(i, i+2)
    if (['==','~=','<=','>=','..','//','<<','>>'].includes(two)) {
      out += span(C.op, two)
      i += 2
      continue
    }

    // Single-char operators
    if ('+-*/%^#&|~<>='.includes(code[i])) {
      out += span(C.op, code[i])
      i++
      continue
    }

    // Punctuation
    if ('(){}[],.;:'.includes(code[i])) {
      out += span(C.punct, code[i])
      i++
      continue
    }

    // Whitespace (pass through as-is, no span)
    if (code[i] === '\n') {
      out += '\n'
      i++
      continue
    }
    if (/\s/.test(code[i])) {
      out += esc(code[i])
      i++
      continue
    }

    // Fallback
    out += esc(code[i])
    i++
  }

  return out
}
