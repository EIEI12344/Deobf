# Prometheus Lua Deobfuscator Web

🔓 Web interface for deobfuscating Prometheus/WeAreDevs obfuscated Lua scripts.

**Live Demo:** [Deploy on Vercel](https://vercel.com)

## Features

- 🎨 **Lua Syntax Highlighting** — Keywords, strings, numbers, functions, builtins all color-coded
- ✏️ **Smart Editor** — Auto-indent, bracket matching, line numbers, tab support
- 🔓 **Deobfuscator** — Extracts string constants, substitutes references, normalizes Luau syntax
- 📋 **Tabs** — Output / Constants / Trace views
- 📂 **File Upload** — Load `.lua` files directly
- ⬇️ **Download** — Save deobfuscated output

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Vercel Edge Runtime**

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

1. Push to GitHub
2. Import repo at [vercel.com/new](https://vercel.com/new)
3. Deploy automatically!

## Color Scheme (Lua Tokens)

| Token | Color |
|-------|-------|
| Keywords | `#ff7b72` (red) |
| Control flow | `#f47067` (orange-red) |
| Strings | `#a5d6ff` (light blue) |
| Numbers | `#79c0ff` (blue) |
| Comments | `#8b949e` (gray) |
| Functions | `#d2a8ff` (purple, italic) |
| Builtins | `#ffa657` (orange) |
| Std libs | `#7ee787` (green) |
