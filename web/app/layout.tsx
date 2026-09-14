import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Prometheus Lua Deobfuscator',
  description: 'Deobfuscate Prometheus / WeAreDevs Lua scripts',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, background: '#0d1117', color: '#c9d1d9', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  )
}
