'use client';

import React, { useState, useCallback, useRef } from 'react';
import LuaEditor from '@/components/LuaEditor';

const SAMPLE_CODE = `-- Sample Prometheus obfuscated Lua
local a={"GetService","Players","LocalPlayer","Character","Humanoid"}
local b=game[a[1]](game, a[2])
local c=b[a[3]]
local d=c[a[4]]
local e=d:FindFirstChild(a[5])
if e then
    e.WalkSpeed = 16
end`;

type TabType = 'output' | 'constants' | 'trace';

export default function HomePage() {
  const [inputCode, setInputCode] = useState('');
  const [outputCode, setOutputCode] = useState('');
  const [constants, setConstants] = useState('');
  const [trace, setTrace] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('output');
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDeobf = useCallback(async () => {
    if (!inputCode.trim()) {
      setError('กรุณากรอก Lua code ก่อน');
      return;
    }
    setLoading(true);
    setError('');
    setDone(false);
    setOutputCode('');
    setConstants('');
    setTrace([]);

    try {
      const res = await fetch('/api/deobf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inputCode }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'เกิดข้อผิดพลาด');
      } else {
        setOutputCode(data.output || '');
        setConstants(data.constants || '');
        setTrace(data.trace || []);
        setDone(true);
        if (data.error) setError(data.error);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [inputCode]);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  }, []);

  const handleLoadSample = useCallback(() => {
    setInputCode(SAMPLE_CODE);
    setOutputCode('');
    setError('');
    setDone(false);
  }, []);

  const handleClear = useCallback(() => {
    setInputCode('');
    setOutputCode('');
    setError('');
    setDone(false);
    setConstants('');
    setTrace([]);
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setInputCode((ev.target?.result as string) || '');
      setOutputCode('');
      setError('');
      setDone(false);
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  const handleDownload = useCallback(() => {
    if (!outputCode) return;
    const blob = new Blob([outputCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'deobfuscated.lua';
    a.click();
    URL.revokeObjectURL(url);
  }, [outputCode]);

  const tabContent: Record<TabType, string> = {
    output: outputCode,
    constants: constants,
    trace: trace.join('\n'),
  };

  const tabLabels: Record<TabType, string> = {
    output: '📄 Output',
    constants: '🔑 Constants',
    trace: '🔍 Trace',
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #0d1117 0%, #0f1923 50%, #0d1117 100%)' }}>
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-5 blur-3xl" style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full opacity-5 blur-3xl" style={{ background: 'radial-gradient(circle, #3b82f6, transparent)' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b" style={{ borderColor: '#21262d', background: 'rgba(22,27,34,0.8)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div className="relative">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl font-bold" style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}>
                🔓
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse" style={{ background: '#7c3aed' }} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight" style={{ background: 'linear-gradient(90deg, #a78bfa, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Prometheus Deobfuscator
              </h1>
              <p className="text-xs" style={{ color: '#8b949e' }}>WeAreDevs Lua Obfuscation Remover</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: '#8b949e' }}>
            <span className="px-2 py-1 rounded" style={{ background: '#21262d', color: '#7ee787' }}>● Online</span>
            <span>Lua 5.1 / Luau</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-4 py-6 flex flex-col gap-4">

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleLoadSample}
            className="px-3 py-1.5 text-xs rounded-md transition-all hover:opacity-80"
            style={{ background: '#21262d', color: '#c9d1d9', border: '1px solid #30363d' }}
          >
            📋 Load Sample
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="px-3 py-1.5 text-xs rounded-md transition-all hover:opacity-80"
            style={{ background: '#21262d', color: '#c9d1d9', border: '1px solid #30363d' }}
          >
            📂 Open File
          </button>
          <input ref={fileRef} type="file" accept=".lua,.txt" className="hidden" onChange={handleFileUpload} />
          <button
            onClick={handleClear}
            className="px-3 py-1.5 text-xs rounded-md transition-all hover:opacity-80"
            style={{ background: '#21262d', color: '#f85149', border: '1px solid #30363d' }}
          >
            🗑️ Clear
          </button>

          <div className="flex-1" />
          <div className="text-xs" style={{ color: '#484f58' }}>
            {inputCode.length.toLocaleString()} chars / {inputCode.split('\n').length} lines
          </div>
        </div>

        {/* Editor panels */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 flex-1">

          {/* Input panel */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#f85149' }} />
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#f0883e' }} />
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#3fb950' }} />
                <span className="text-xs ml-2 font-medium" style={{ color: '#8b949e' }}>input.lua</span>
              </div>
              <button
                onClick={() => handleCopy(inputCode)}
                className="text-xs px-2 py-1 rounded hover:opacity-70 transition-opacity"
                style={{ color: '#8b949e' }}
              >
                Copy
              </button>
            </div>
            <div
              className="flex-1 rounded-xl overflow-hidden transition-all duration-300"
              style={{
                border: `1px solid ${loading ? '#7c3aed' : '#30363d'}`,
                boxShadow: loading ? '0 0 20px rgba(124,58,237,0.3)' : 'none',
                background: '#0d1117',
              }}
            >
              <LuaEditor
                value={inputCode}
                onChange={setInputCode}
                placeholder="วางโค้ด Lua ที่ต้องการถอดรหัสที่นี่..."
                height="calc(100vh - 340px)"
                lineNumbers
              />
            </div>
          </div>

          {/* Output panel */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Tab buttons */}
                {(Object.keys(tabLabels) as TabType[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="text-xs px-3 py-1 rounded-md transition-all"
                    style={{
                      background: activeTab === tab ? '#21262d' : 'transparent',
                      color: activeTab === tab ? '#c9d1d9' : '#8b949e',
                      border: `1px solid ${activeTab === tab ? '#30363d' : 'transparent'}`,
                      fontWeight: activeTab === tab ? 600 : 400,
                    }}
                  >
                    {tabLabels[tab]}
                    {tab === 'constants' && constants && (
                      <span className="ml-1 text-xs px-1 rounded" style={{ background: '#7c3aed30', color: '#a78bfa' }}>
                        {constants.split('\n').filter(l => l.includes('=')).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                {done && (
                  <button
                    onClick={handleDownload}
                    className="text-xs px-2 py-1 rounded hover:opacity-70 transition-opacity"
                    style={{ color: '#3fb950' }}
                  >
                    ⬇ Download
                  </button>
                )}
                <button
                  onClick={() => handleCopy(tabContent[activeTab])}
                  className="text-xs px-2 py-1 rounded hover:opacity-70 transition-opacity"
                  style={{ color: '#8b949e' }}
                >
                  Copy
                </button>
              </div>
            </div>

            <div
              className="flex-1 rounded-xl overflow-hidden relative transition-all duration-300"
              style={{
                border: `1px solid ${done ? '#238636' : '#30363d'}`,
                boxShadow: done ? '0 0 20px rgba(35,134,54,0.2)' : 'none',
                background: '#0d1117',
              }}
            >
              {!tabContent[activeTab] && !loading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ color: '#484f58' }}>
                  <div className="text-5xl">🔒</div>
                  <p className="text-sm">Output จะปรากฏที่นี่หลังกด Deobf</p>
                </div>
              ) : loading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-transparent animate-spin" style={{ borderTopColor: '#7c3aed', borderRightColor: '#3b82f6' }} />
                    <div className="absolute inset-0 flex items-center justify-center text-2xl">⚡</div>
                  </div>
                  <p className="text-sm animate-pulse" style={{ color: '#8b949e' }}>กำลังถอดรหัส...</p>
                </div>
              ) : (
                <LuaEditor
                  value={tabContent[activeTab]}
                  onChange={() => {}}
                  readOnly
                  height="calc(100vh - 340px)"
                  lineNumbers={activeTab === 'output'}
                />
              )}
            </div>
          </div>
        </div>

        {/* DEOBF Button + Error */}
        <div className="flex flex-col items-center gap-3 pt-2">
          {error && (
            <div
              className="w-full max-w-xl px-4 py-2 rounded-lg text-sm border animate-fade-in"
              style={{ background: '#161b22', borderColor: '#f85149', color: '#ffa198' }}
            >
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={handleDeobf}
            disabled={loading}
            className="relative overflow-hidden group px-10 py-4 rounded-xl font-bold text-base tracking-wider uppercase transition-all duration-300 disabled:opacity-50"
            style={{
              background: loading
                ? '#21262d'
                : 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #3b82f6 100%)',
              boxShadow: loading ? 'none' : '0 0 30px rgba(124,58,237,0.5), 0 4px 20px rgba(0,0,0,0.4)',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.1)',
              minWidth: '240px',
              letterSpacing: '0.1em',
            }}
          >
            {/* Shimmer effect */}
            {!loading && (
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
                  transform: 'skewX(-20deg)',
                }}
              />
            )}
            <span className="relative flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <span className="animate-spin">⚙️</span>
                  กำลังถอดรหัส...
                </>
              ) : (
                <>
                  🔓 Deobfuscate
                </>
              )}
            </span>
          </button>

          {done && (
            <p className="text-xs animate-fade-in" style={{ color: '#3fb950' }}>
              ✅ ถอดรหัสสำเร็จ! ตรวจสอบผลลัพธ์ใน Output panel
            </p>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t py-4 text-center text-xs" style={{ borderColor: '#21262d', color: '#484f58' }}>
        Prometheus WeAreDevs Deobfuscator &nbsp;·&nbsp; Built with Next.js &nbsp;·&nbsp; Deployed on Vercel
      </footer>
    </div>
  );
}
