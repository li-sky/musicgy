import { NextResponse } from 'next/server';
import { neteaseService } from '@/services/netease';

export async function GET() {
  try {
    const key = await neteaseService.getQrKey();
    return NextResponse.json({ key });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get QR key' }, { status: 500 });
  }
}
