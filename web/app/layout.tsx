import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Prometheus Lua Deobfuscator',
  description: 'Deobfuscate Prometheus/WeAreDevs obfuscated Lua scripts',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-editor-bg text-white min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
