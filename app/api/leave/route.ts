import { NextRequest, NextResponse } from 'next/server';
import { roomService } from '@/services/room';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    let userId: string | undefined;
    let connectionId: string | undefined;

    // Try JSON first, then fallback to text (sendBeacon posts as text/plain)
    try {
      const body = await request.json();
      userId = body?.userId;
      connectionId = body?.connectionId;
    } catch (e) {
      try {
        const txt = await request.text();
        if (txt) {
          // attempt to parse JSON from text
          try { 
            const parsed = JSON.parse(txt);
            userId = parsed?.userId;
            connectionId = parsed?.connectionId;
          } catch { userId = txt; }
        }
      } catch {}
    }

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    console.log(`Leave request for userId=${userId}, conn=${connectionId}`);
    const count = await roomService.leaveRoom(userId, connectionId);
    console.log(`After leave activeUsers=${count}`);
    return NextResponse.json({ success: true, activeUsers: count });
  } catch (error) {
    console.error('Leave failed', error);
    return NextResponse.json({ error: 'Leave failed' }, { status: 500 });
  }
}
