import { NextRequest, NextResponse } from 'next/server'
import { deobfuscate } from '@/lib/deobfuscator'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { code?: unknown }
    const code = body?.code

    if (typeof code !== 'string' || !code) {
      return NextResponse.json({ success: false, warning: 'Missing code' }, { status: 400 })
    }
    if (code.length > 1_000_000) {
      return NextResponse.json({ success: false, warning: 'Code too large (max 1MB)' }, { status: 413 })
    }

    const result = deobfuscate(code)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ success: false, warning: String(err) }, { status: 500 })
  }
}
