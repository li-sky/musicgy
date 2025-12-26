import { NextRequest, NextResponse } from 'next/server';
import { roomService } from '@/services/room';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId') || undefined;

    // If client is polling with userId, update heartbeat so short refresh gaps don't cause timeout
    if (userId) {
      await roomService.heartbeat(userId);
    }

    const state = await roomService.getState();
    // Add server timestamp for better sync
    return NextResponse.json({
      ...state,
      serverTime: Date.now()
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get state' }, { status: 500 });
  }
}
