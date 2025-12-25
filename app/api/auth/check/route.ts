import { NextRequest, NextResponse } from 'next/server';
import { neteaseService } from '@/services/netease';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key } = body;
    
    if (!key) {
      return NextResponse.json({ error: 'key required' }, { status: 400 });
    }

    const result = await neteaseService.checkQr(key);
    if (result.code === 803) {
      neteaseService.setCookie(result.cookie);
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to check QR' }, { status: 500 });
  }
}
