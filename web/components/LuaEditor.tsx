'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { tokenizeToHtml } from '@/lib/luaHighlight';

interface LuaEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  lineNumbers?: boolean;
  height?: string;
}

export default function LuaEditor({
  value,
  onChange,
  placeholder = '',
  readOnly = false,
  lineNumbers = true,
  height = '400px',
}: LuaEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lineNumRef = useRef<HTMLDivElement>(null);
  const [highlighted, setHighlighted] = useState('');

  // Sync highlight whenever value changes
  useEffect(() => {
    const html = value ? tokenizeToHtml(value) + '\n' : '';
    setHighlighted(html);
  }, [value]);

  // Sync scroll between textarea and highlight overlay
  const syncScroll = useCallback(() => {
    if (!textareaRef.current || !highlightRef.current) return;
    highlightRef.current.scrollTop = textareaRef.current.scrollTop;
    highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    if (lineNumRef.current) {
      lineNumRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (readOnly) return;
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;

      // Tab → insert 4 spaces
      if (e.key === 'Tab') {
        e.preventDefault();
        const newVal = value.slice(0, start) + '    ' + value.slice(end);
        onChange(newVal);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + 4;
        });
        return;
      }

      // Auto-close brackets/quotes
      const pairs: Record<string, string> = {
        '(': ')',
        '[': ']',
        '{': '}',
        '"': '"',
        "'": "'",
      };
      if (pairs[e.key] && start === end) {
        e.preventDefault();
        const close = pairs[e.key];
        const newVal = value.slice(0, start) + e.key + close + value.slice(end);
        onChange(newVal);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + 1;
        });
        return;
      }

      // Enter → maintain indentation
      if (e.key === 'Enter') {
        e.preventDefault();
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const currentLine = value.slice(lineStart, start);
        const indentMatch = currentLine.match(/^(\s+)/);
        const indent = indentMatch ? indentMatch[1] : '';

        // Auto-indent after do/then/else/function/repeat
        const extraIndent = /\b(do|then|else|elseif|function|repeat)\s*$/.test(currentLine.trimEnd())
          ? '    '
          : '';

        const insertion = '\n' + indent + extraIndent;
        const newVal = value.slice(0, start) + insertion + value.slice(end);
        onChange(newVal);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + insertion.length;
        });
      }
    },
    [value, onChange, readOnly]
  );

  const lineCount = value ? value.split('\n').length : 1;

  return (
    <div
      className="relative rounded-lg overflow-hidden border border-editor-border"
      style={{ height, fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace", fontSize: '13.5px' }}
    >
      <div className="flex h-full">
        {/* Line numbers */}
        {lineNumbers && (
          <div
            ref={lineNumRef}
            className="select-none overflow-hidden flex-shrink-0 text-right pr-3 pl-3 pt-4 pb-4"
            style={{
              background: '#0d1117',
              color: '#484f58',
              lineHeight: '1.65rem',
              minWidth: '3.5rem',
              borderRight: '1px solid #21262d',
              overflowY: 'hidden',
            }}
          >
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i + 1} style={{ height: '1.65rem' }}>
                {i + 1}
              </div>
            ))}
          </div>
        )}

        {/* Editor area */}
        <div className="relative flex-1 overflow-hidden" ref={scrollRef}>
          {/* Highlighted overlay */}
          <div
            ref={highlightRef}
            className="absolute inset-0 p-4 overflow-auto pointer-events-none"
            style={{
              background: 'transparent',
              color: '#c9d1d9',
              lineHeight: '1.65rem',
              whiteSpace: 'pre',
              wordWrap: 'normal',
              tabSize: 4,
            }}
            dangerouslySetInnerHTML={{ __html: highlighted || `<span style="color:#484f58">${placeholder}</span>` }}
          />

          {/* Raw textarea (transparent, on top) */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => onChange(e.target.value)}
            onScroll={syncScroll}
            onKeyDown={handleKeyDown}
            readOnly={readOnly}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            className="absolute inset-0 w-full h-full p-4 resize-none outline-none bg-transparent text-transparent caret-white"
            style={{
              lineHeight: '1.65rem',
              whiteSpace: 'pre',
              wordWrap: 'normal',
              tabSize: 4,
              caretColor: '#58a6ff',
              overflowX: 'auto',
              overflowY: 'auto',
            }}
          />
        </div>
      </div>
    </div>
  );
}
