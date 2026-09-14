# Prometheus Lua Deobfuscator — Web

> ถอดรหัส Lua script ที่ obfuscate ด้วย Prometheus / WeAreDevs

## วิธี Run Local

```bash
cd web
npm install
npm run dev       # → http://localhost:3000
npm run build     # ตรวจสอบก่อน deploy
```

## วิธี Deploy Vercel

### วิธีที่ 1 — Vercel Website (แนะนำ)
1. Push folder `web/` ขึ้น GitHub repo
2. ไป [vercel.com/new](https://vercel.com/new) → Import repo
3. ตั้ง **Root Directory = `web`**
4. กด Deploy

### วิธีที่ 2 — Vercel CLI
```bash
npm i -g vercel
cd web
vercel --prod
```

## โครงสร้าง

```
web/
├── app/
│   ├── page.tsx            ← UI หลัก
│   ├── layout.tsx
│   ├── globals.css
│   └── api/deobf/route.ts  ← API (Vercel Edge)
├── components/
│   └── LuaEditor.tsx       ← Editor + syntax highlight
├── lib/
│   ├── luaHighlight.ts     ← Lua tokenizer
│   └── deobfuscator.ts     ← Deobf logic
└── ...config files
```

## Lua Syntax Colors

| Type | Color |
|------|-------|
| Control keywords (`if/while/for`) | `#f47067` |
| Other keywords (`local/function`) | `#ff7b72` |
| Strings | `#a5d6ff` |
| Numbers / booleans / nil | `#79c0ff` |
| Function calls | `#d2a8ff` italic |
| Builtins (`print/pairs`) | `#ffa657` |
| Std libs (`string/table/math`) | `#7ee787` |
| Comments | `#8b949e` |
| Operators | `#ff7b72` |
