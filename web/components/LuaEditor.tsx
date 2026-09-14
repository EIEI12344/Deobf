'use client'

import { useEffect, useRef, useCallback } from 'react'
import { tokenizeToHtml } from '@/lib/luaHighlight'

interface Props {
  value: string
  onChange?: (v: string) => void
  readOnly?: boolean
  height?: string
  placeholder?: string
}

export default function LuaEditor({ value, onChange, readOnly = false, height = '400px', placeholder = '' }: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null)
  const hlRef = useRef<HTMLDivElement>(null)
  const lnRef = useRef<HTMLDivElement>(null)

  // Re-render highlight whenever value changes
  useEffect(() => {
    if (!hlRef.current) return
    hlRef.current.innerHTML = value ? tokenizeToHtml(value) + '\n' : `<span style="color:#484f58">${placeholder}</span>`
  }, [value, placeholder])

  // Sync scroll
  const syncScroll = useCallback(() => {
    const ta = taRef.current
    const hl = hlRef.current
    const ln = lnRef.current
    if (!ta || !hl) return
    hl.scrollTop = ta.scrollTop
    hl.scrollLeft = ta.scrollLeft
    if (ln) ln.scrollTop = ta.scrollTop
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (readOnly) return
    const ta = e.currentTarget
    const start = ta.selectionStart
    const end = ta.selectionEnd

    if (e.key === 'Tab') {
      e.preventDefault()
      const next = value.slice(0, start) + '    ' + value.slice(end)
      onChange?.(next)
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 4 })
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      const lineStart = value.lastIndexOf('\n', start - 1) + 1
      const currentLine = value.slice(lineStart, start)
      const indentMatch = /^(\s+)/.exec(currentLine)
      const indent = indentMatch ? indentMatch[1] : ''
      const extra = /\b(do|then|else|elseif|function|repeat)\s*$/.test(currentLine.trimEnd()) ? '    ' : ''
      const ins = '\n' + indent + extra
      const next = value.slice(0, start) + ins + value.slice(end)
      onChange?.(next)
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + ins.length })
      return
    }

    // Auto-close pairs
    const PAIRS: Record<string, string> = { '(': ')', '[': ']', '{': '}' }
    if (PAIRS[e.key] && start === end) {
      e.preventDefault()
      const close = PAIRS[e.key]
      const next = value.slice(0, start) + e.key + close + value.slice(end)
      onChange?.(next)
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 1 })
    }
  }, [value, onChange, readOnly])

  const lineCount = Math.max(1, (value.match(/\n/g) ?? []).length + 1)

  // Shared font/line-height style
  const FONT: React.CSSProperties = {
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: '13px',
    lineHeight: '22px',
    tabSize: 4,
  }

  return (
    <div style={{ height, display: 'flex', background: '#0d1117', overflow: 'hidden' }}>
      {/* Line numbers */}
      <div
        ref={lnRef}
        style={{
          ...FONT,
          width: '52px',
          flexShrink: 0,
          overflowY: 'hidden',
          overflowX: 'hidden',
          padding: '12px 8px 12px 0',
          textAlign: 'right',
          color: '#484f58',
          background: '#0d1117',
          borderRight: '1px solid #21262d',
          userSelect: 'none',
        }}
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i} style={{ height: '22px' }}>{i + 1}</div>
        ))}
      </div>

      {/* Editor area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Highlight layer */}
        <div
          ref={hlRef}
          style={{
            ...FONT,
            position: 'absolute',
            inset: 0,
            padding: '12px 16px',
            margin: 0,
            overflow: 'auto',
            whiteSpace: 'pre',
            wordBreak: 'normal',
            overflowWrap: 'normal',
            pointerEvents: 'none',
            color: '#c9d1d9',
          }}
        />
        {/* Textarea (transparent, captures input) */}
        <textarea
          ref={taRef}
          value={value}
          onChange={e => onChange?.(e.target.value)}
          onScroll={syncScroll}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          style={{
            ...FONT,
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            padding: '12px 16px',
            margin: 0,
            resize: 'none',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: 'transparent',
            caretColor: '#58a6ff',
            overflowX: 'auto',
            overflowY: 'auto',
            whiteSpace: 'pre',
            wordBreak: 'normal',
            overflowWrap: 'normal',
          }}
        />
      </div>
    </div>
  )
}
