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

    const qrimg = await neteaseService.createQr(key);
    return NextResponse.json({ qrimg });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create QR' }, { status: 500 });
  }
}
