'use client'

import { useState, useCallback, useRef } from 'react'
import LuaEditor from '@/components/LuaEditor'
import type { DeobfResult } from '@/lib/deobfuscator'

// ── Sample obfuscated code ───────────────────────────────────────────────────
const SAMPLE = `local a={"GetService","Players","LocalPlayer","Character","Humanoid","WalkSpeed"}
local b=game[a[1]](game,a[2])
local c=b[a[3]]
local d=c[a[4]]
local e=d and d:FindFirstChild(a[5])
if e then
    e[a[6]]=32
end`

// ── Styles ───────────────────────────────────────────────────────────────────
const S = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    background: '#0d1117',
    fontFamily: 'system-ui, sans-serif',
  },
  header: {
    padding: '12px 20px',
    borderBottom: '1px solid #21262d',
    background: 'rgba(22,27,34,0.95)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky' as const,
    top: 0,
    zIndex: 10,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: 'linear-gradient(135deg,#7c3aed,#3b82f6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
  },
  logoTitle: {
    margin: 0,
    fontSize: 15,
    fontWeight: 700,
    background: 'linear-gradient(90deg,#a78bfa,#60a5fa)',
    WebkitBackgroundClip: 'text' as const,
    WebkitTextFillColor: 'transparent' as const,
  },
  logoSub: {
    margin: 0,
    fontSize: 11,
    color: '#8b949e',
  },
  badge: {
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 20,
    background: '#21262d',
    color: '#7ee787',
    border: '1px solid #238636',
  },
  main: {
    flex: 1,
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
    maxWidth: 1600,
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box' as const,
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap' as const,
  },
  btnSecondary: {
    padding: '5px 12px',
    fontSize: 12,
    borderRadius: 6,
    border: '1px solid #30363d',
    background: '#21262d',
    color: '#c9d1d9',
    cursor: 'pointer',
    transition: 'opacity .15s',
  },
  btnDanger: {
    padding: '5px 12px',
    fontSize: 12,
    borderRadius: 6,
    border: '1px solid #30363d',
    background: '#21262d',
    color: '#f85149',
    cursor: 'pointer',
  },
  panels: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    flex: 1,
  },
  panel: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 2px',
  },
  dots: { display: 'flex', gap: 5, alignItems: 'center' },
  tabBar: { display: 'flex', gap: 4 },
  editorWrap: {
    flex: 1,
    borderRadius: 10,
    border: '1px solid #30363d',
    overflow: 'hidden',
    background: '#0d1117',
  },
  footer: {
    borderTop: '1px solid #21262d',
    padding: '10px 20px',
    textAlign: 'center' as const,
    fontSize: 11,
    color: '#484f58',
  },
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function Dot({ color }: { color: string }) {
  return <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
}

function IconBtn({ label, onClick, color = '#c9d1d9' }: { label: string; onClick: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      style={{ ...S.btnSecondary, color }}
    >
      {label}
    </button>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
type Tab = 'output' | 'constants'

export default function Page() {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<DeobfResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<Tab>('output')
  const fileRef = useRef<HTMLInputElement>(null)

  const editorHeight = 'calc(100vh - 240px)'

  const handleDeobf = useCallback(async () => {
    if (!input.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/deobf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: input }),
      })
      const data = (await res.json()) as DeobfResult
      setResult(data)
      setTab('output')
    } catch (e) {
      setResult({ success: false, output: '', constants: '', trace: [], warning: String(e) })
    } finally {
      setLoading(false)
    }
  }, [input])

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = ev => {
      setInput((ev.target?.result as string) ?? '')
      setResult(null)
    }
    reader.readAsText(f, 'utf-8')
    e.target.value = ''
  }, [])

  const handleDownload = useCallback(() => {
    if (!result?.output) return
    const blob = new Blob([result.output], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'deobfuscated.lua'; a.click()
    URL.revokeObjectURL(url)
  }, [result])

  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
  }, [])

  const tabContent = tab === 'output' ? (result?.output ?? '') : (result?.constants ?? '')
  const inputLines = input.split('\n').length
  const inputChars = input.length

  return (
    <div style={S.page}>
      {/* Header */}
      <header style={S.header}>
        <div style={S.logo}>
          <div style={S.logoIcon}>🔓</div>
          <div>
            <p style={S.logoTitle}>Prometheus Deobfuscator</p>
            <p style={S.logoSub}>WeAreDevs / Prometheus Lua Obfuscation Remover</p>
          </div>
        </div>
        <div style={S.badge}>● Online</div>
      </header>

      {/* Main */}
      <main style={S.main}>
        {/* Toolbar */}
        <div style={S.toolbar}>
          <IconBtn label="📋 Load Sample" onClick={() => { setInput(SAMPLE); setResult(null) }} />
          <IconBtn label="📂 Open .lua" onClick={() => fileRef.current?.click()} />
          <input ref={fileRef} type="file" accept=".lua,.txt" style={{ display: 'none' }} onChange={handleFile} />
          <IconBtn label="🗑️ Clear" onClick={() => { setInput(''); setResult(null) }} color="#f85149" />
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: '#484f58' }}>
            {inputLines.toLocaleString()} lines · {inputChars.toLocaleString()} chars
          </span>
        </div>

        {/* Panels */}
        <div style={S.panels}>
          {/* Input */}
          <div style={S.panel}>
            <div style={S.panelHeader}>
              <div style={S.dots}>
                <Dot color="#f85149" /><Dot color="#f0883e" /><Dot color="#3fb950" />
                <span style={{ fontSize: 12, color: '#8b949e', marginLeft: 6 }}>input.lua</span>
              </div>
              <button style={{ ...S.btnSecondary, fontSize: 11 }} onClick={() => copy(input)}>Copy</button>
            </div>
            <div style={{
              ...S.editorWrap,
              borderColor: loading ? '#7c3aed' : '#30363d',
              boxShadow: loading ? '0 0 16px rgba(124,58,237,0.35)' : 'none',
            }}>
              <LuaEditor
                value={input}
                onChange={setInput}
                height={editorHeight}
                placeholder="วางโค้ด Lua obfuscated ที่นี่..."
              />
            </div>
          </div>

          {/* Output */}
          <div style={S.panel}>
            <div style={S.panelHeader}>
              {/* Tabs */}
              <div style={S.tabBar}>
                {(['output', 'constants'] as Tab[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    style={{
                      ...S.btnSecondary,
                      fontSize: 11,
                      background: tab === t ? '#30363d' : '#21262d',
                      color: tab === t ? '#e6edf3' : '#8b949e',
                      fontWeight: tab === t ? 600 : 400,
                    }}
                  >
                    {t === 'output' ? '📄 Output' : '🔑 Constants'}
                    {t === 'constants' && result?.constants && (
                      <span style={{
                        marginLeft: 5,
                        fontSize: 10,
                        background: '#7c3aed30',
                        color: '#a78bfa',
                        borderRadius: 10,
                        padding: '1px 5px',
                      }}>
                        {result.constants.split('\n').filter(l => l.startsWith('-- [')).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {result?.success && (
                  <button style={{ ...S.btnSecondary, fontSize: 11, color: '#3fb950' }} onClick={handleDownload}>
                    ⬇ Download
                  </button>
                )}
                <button style={{ ...S.btnSecondary, fontSize: 11 }} onClick={() => copy(tabContent)}>
                  Copy
                </button>
              </div>
            </div>

            <div style={{
              ...S.editorWrap,
              borderColor: result?.success ? '#238636' : result ? '#f85149' : '#30363d',
              boxShadow: result?.success ? '0 0 14px rgba(35,134,54,0.2)' : 'none',
              position: 'relative',
            }}>
              {/* Placeholder states */}
              {!result && !loading && (
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 10, color: '#484f58',
                }}>
                  <div style={{ fontSize: 40 }}>🔒</div>
                  <div style={{ fontSize: 13 }}>Output จะแสดงที่นี่</div>
                </div>
              )}
              {loading && (
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 12,
                }}>
                  <div style={{
                    width: 40, height: 40,
                    border: '3px solid #21262d',
                    borderTop: '3px solid #7c3aed',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  <div style={{ fontSize: 13, color: '#8b949e' }}>กำลังถอดรหัส...</div>
                </div>
              )}
              {result && !loading && (
                <LuaEditor
                  value={tabContent}
                  readOnly
                  height={editorHeight}
                />
              )}
            </div>
          </div>
        </div>

        {/* Warning / Error banner */}
        {result?.warning && (
          <div style={{
            padding: '8px 14px',
            borderRadius: 8,
            background: '#161b22',
            border: `1px solid ${result.success ? '#e3b341' : '#f85149'}`,
            color: result.success ? '#e3b341' : '#ffa198',
            fontSize: 12,
          }}>
            ⚠️ {result.warning}
          </div>
        )}

        {/* DEOBF button */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
          <button
            onClick={handleDeobf}
            disabled={loading || !input.trim()}
            style={{
              padding: '13px 48px',
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase' as const,
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)',
              background: (loading || !input.trim())
                ? '#21262d'
                : 'linear-gradient(135deg,#7c3aed 0%,#4f46e5 50%,#3b82f6 100%)',
              color: '#fff',
              cursor: (loading || !input.trim()) ? 'not-allowed' : 'pointer',
              boxShadow: (loading || !input.trim())
                ? 'none'
                : '0 0 28px rgba(124,58,237,0.5)',
              transition: 'all .2s',
              opacity: (loading || !input.trim()) ? 0.5 : 1,
            }}
          >
            {loading ? '⚙️ กำลังถอดรหัส...' : '🔓 Deobfuscate'}
          </button>
        </div>

        {result?.success && !loading && (
          <div style={{ textAlign: 'center', fontSize: 12, color: '#3fb950' }}>
            ✅ ถอดรหัสสำเร็จ!
          </div>
        )}
      </main>

      <footer style={S.footer}>
        Prometheus Deobfuscator · Next.js · Vercel Edge
      </footer>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
