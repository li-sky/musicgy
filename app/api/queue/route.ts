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

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { index, userId, songId } = body;

    if (index === undefined || index === null || !userId) {
      return NextResponse.json({ error: 'index and userId required' }, { status: 400 });
    }

    const removed = await roomService.removeFromQueue(Number(index), String(userId), songId === undefined ? undefined : Number(songId));
    if (!removed) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const code = String(error?.code || error?.message || '');
    if (code.includes('invalid_index')) {
      return NextResponse.json({ error: 'Invalid index' }, { status: 400 });
    }
    if (code.includes('forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (code.includes('mismatch')) {
      return NextResponse.json({ error: 'Queue changed, please retry' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Remove failed' }, { status: 500 });
  }
}
