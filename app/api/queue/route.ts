import { NextRequest, NextResponse } from 'next/server';
import { roomService } from '@/services/room';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { songId, userId } = body;
    
    if (!songId || !userId) {
      return NextResponse.json({ error: 'songId and userId required' }, { status: 400 });
    }

    await roomService.addToQueue(songId, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Add failed' }, { status: 500 });
  }
}
