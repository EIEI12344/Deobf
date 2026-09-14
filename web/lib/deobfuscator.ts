// Prometheus / WeAreDevs Lua Deobfuscator — TypeScript port

export interface DeobfResult {
  success: boolean
  output: string
  constants: string
  trace: string[]
  warning?: string
}

// ── Luau compound assignment normalizer ──────────────────────────────────────

const COMPOUND_OPS = ['+=', '-=', '*=', '/=', '%=', '..='] as const

function findLhsStart(s: string, opIdx: number): number {
  let i = opIdx - 1
  while (i >= 0 && /\s/.test(s[i])) i--
  // handle ] bracket chains
  while (i >= 0 && s[i] === ']') {
    let d = 1; i--
    while (i >= 0 && d > 0) {
      if (s[i] === ']') d++
      else if (s[i] === '[') d--
      i--
    }
  }
  while (i >= 0 && /[a-zA-Z0-9_]/.test(s[i])) i--
  // handle dot chains
  while (i >= 0 && s[i] === '.') {
    i--
    while (i >= 0 && s[i] === ']') {
      let d = 1; i--
      while (i >= 0 && d > 0) {
        if (s[i] === ']') d++
        else if (s[i] === '[') d--
        i--
      }
    }
    while (i >= 0 && /[a-zA-Z0-9_]/.test(s[i])) i--
  }
  return i + 1
}

function findRhsEnd(s: string, start: number): number {
  let i = start
  const n = s.length
  let br = 0, pr = 0, bo = 0
  let q: string | null = null
  while (i < n && /\s/.test(s[i])) i++
  while (i < n) {
    const c = s[i]
    if (q) {
      if (c === '\\') { i += 2; continue }
      if (c === q) q = null
      i++; continue
    }
    if (c === '"' || c === "'") { q = c; i++; continue }
    if (c === '[') br++
    else if (c === ']') br = Math.max(0, br - 1)
    else if (c === '(') pr++
    else if (c === ')') {
      if (pr === 0 && br === 0 && bo === 0) break
      pr = Math.max(0, pr - 1)
    } else if (c === '{') bo++
    else if (c === '}') {
      if (bo === 0 && br === 0 && pr === 0) break
      bo = Math.max(0, bo - 1)
    } else if (br === 0 && pr === 0 && bo === 0) {
      if (';,\n\r'.includes(c) || (c !== ' ' && /\s/.test(c))) break
    }
    i++
  }
  return i
}

function normalizeLuau(code: string): string {
  const patches: Array<[number, number, string]> = []
  let i = 0
  while (i < code.length) {
    let op: string | null = null
    for (const o of COMPOUND_OPS) {
      if (code.startsWith(o, i)) { op = o; break }
    }
    if (!op) { i++; continue }
    const lhsStart = findLhsStart(code, i)
    const rhsStart = i + op.length
    const rhsEnd = findRhsEnd(code, rhsStart)
    const lhs = code.slice(lhsStart, i).trim()
    const rhs = code.slice(rhsStart, rhsEnd).trim()
    if (lhs && rhs) {
      patches.push([lhsStart, rhsEnd, `${lhs} = ${lhs} ${op.slice(0,-1)} ${rhs}`])
    }
    i = rhsEnd
  }
  if (!patches.length) return code
  let out = code
  for (const [s, e, r] of [...patches].reverse()) {
    out = out.slice(0, s) + r + out.slice(e)
  }
  return out
}

// ── String table extractor ───────────────────────────────────────────────────

function findTableEnd(s: string, open: number): number {
  let depth = 0
  let q: string | null = null
  let i = open
  while (i < s.length) {
    const c = s[i]
    if (q) {
      if (c === '\\') { i += 2; continue }
      if (c === q) q = null
      i++; continue
    }
    if (c === '"' || c === "'") q = c
    else if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) return i + 1
    }
    i++
  }
  return -1
}

/** Parse escape sequences in a Lua string literal body (without surrounding quotes) */
function parseLuaEsc(raw: string): string {
  let out = ''
  let i = 0
  while (i < raw.length) {
    if (raw[i] !== '\\') { out += raw[i++]; continue }
    i++
    if (i >= raw.length) break
    const c = raw[i]
    if (c === 'n')  { out += '\n'; i++; continue }
    if (c === 't')  { out += '\t'; i++; continue }
    if (c === 'r')  { out += '\r'; i++; continue }
    if (c === '\\') { out += '\\'; i++; continue }
    if (c === '"')  { out += '"';  i++; continue }
    if (c === "'")  { out += "'";  i++; continue }
    if (c === 'a')  { out += '\x07'; i++; continue }
    if (c === 'b')  { out += '\x08'; i++; continue }
    if (c === 'f')  { out += '\x0C'; i++; continue }
    if (c === 'v')  { out += '\x0B'; i++; continue }
    if (/[0-9]/.test(c)) {
      let num = ''
      while (i < raw.length && /[0-9]/.test(raw[i]) && num.length < 3) num += raw[i++]
      out += String.fromCharCode(parseInt(num, 10))
      continue
    }
    out += c; i++
  }
  return out
}

function extractStringTable(code: string, varName: string): Record<number, string> | null {
  const re = new RegExp(`\\blocal\\s+${varName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*=\\s*\\{`)
  const m = re.exec(code)
  if (!m) return null
  const open = code.indexOf('{', m.index)
  const end = findTableEnd(code, open)
  if (end === -1) return null
  const body = code.slice(open + 1, end - 1)

  const table: Record<number, string> = {}
  let idx = 0
  let i = 0
  while (i < body.length) {
    // quoted string
    if (body[i] === '"' || body[i] === "'") {
      const q = body[i]; i++
      let raw = ''
      while (i < body.length) {
        if (body[i] === '\\') { raw += body[i] + (body[i+1] ?? ''); i += 2; continue }
        if (body[i] === q) { i++; break }
        raw += body[i++]
      }
      idx++
      table[idx] = parseLuaEsc(raw)
      continue
    }
    // long string [[
    if (body[i] === '[') {
      let j = i + 1; let level = 0
      while (j < body.length && body[j] === '=') { level++; j++ }
      if (body[j] === '[') {
        const close = ']' + '='.repeat(level) + ']'
        const end2 = body.indexOf(close, j + 1)
        if (end2 !== -1) {
          idx++
          // long strings strip first newline
          let content = body.slice(j + 1, end2)
          if (content.startsWith('\n')) content = content.slice(1)
          table[idx] = content
          i = end2 + close.length
          continue
        }
      }
    }
    i++
  }
  return Object.keys(table).length ? table : null
}

// ── Main deobfuscate ─────────────────────────────────────────────────────────

export function deobfuscate(rawCode: string): DeobfResult {
  try {
    // 1. Normalize Luau compound assignments
    let code = normalizeLuau(rawCode)

    // 2. Find obfuscated string table variable
    const varMatch = code.match(/local ([a-zA-Z0-9_]+)\s*=\s*\{"/)
    if (!varMatch) {
      return {
        success: true,
        output: code,
        constants: '',
        trace: [],
        warning: 'ไม่พบ string table ที่ obfuscate — แสดง code ที่ normalize แล้ว',
      }
    }
    const varName = varMatch[1]

    // 3. Extract string constants
    const table = extractStringTable(code, varName)
    const constCount = table ? Object.keys(table).length : 0

    let constantsBlock = ''
    if (table) {
      const lines = [`-- String constants (${constCount} entries)`]
      for (const [k, v] of Object.entries(table)) {
        lines.push(`-- [${k}] = ${JSON.stringify(v)}`)
      }
      constantsBlock = lines.join('\n')
    }

    // 4. Substitute varName[N] → actual string literal
    let result = code
    if (table) {
      result = result.replace(
        new RegExp(`${varName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*\\[\\s*(\\d+)\\s*\\]`, 'g'),
        (_, idx) => {
          const s = table[parseInt(idx)]
          return s !== undefined ? JSON.stringify(s) : _
        }
      )
    }

    // 5. Remove the original string table declaration
    const re2 = new RegExp(`local\\s+${varName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*=\\s*\\{`)
    const m2 = re2.exec(result)
    if (m2) {
      const open = result.indexOf('{', m2.index)
      const end = findTableEnd(result, open)
      if (end !== -1) {
        // remove the whole declaration line
        let lineStart = m2.index
        while (lineStart > 0 && result[lineStart-1] !== '\n') lineStart--
        let lineEnd = end
        while (lineEnd < result.length && result[lineEnd] !== '\n') lineEnd++
        result = result.slice(0, lineStart) + result.slice(lineEnd + 1)
      }
    }

    // 6. Clean up blank lines (max 2 consecutive)
    result = result.replace(/\n{3,}/g, '\n\n').trim()

    const header = [
      `-- ✅ Deobfuscated by Prometheus Deobfuscator`,
      `-- Variable: ${varName} | Constants extracted: ${constCount}`,
      '',
    ].join('\n')

    return {
      success: true,
      output: header + result,
      constants: constantsBlock,
      trace: [],
    }
  } catch (err) {
    return {
      success: false,
      output: '',
      constants: '',
      trace: [],
      warning: String(err),
    }
  }
}
