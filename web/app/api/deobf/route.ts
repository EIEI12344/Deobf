import { NextRequest, NextResponse } from 'next/server';
import { deobfuscate } from '@/lib/deobfuscator';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = body?.code;

    if (typeof code !== 'string') {
      return NextResponse.json({ error: 'Missing code field' }, { status: 400 });
    }

    if (code.length > 500_000) {
      return NextResponse.json({ error: 'Code too large (max 500KB)' }, { status: 413 });
    }

    const result = deobfuscate(code);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err), success: false }, { status: 500 });
  }
}
