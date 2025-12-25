import { NextRequest, NextResponse } from 'next/server';
import { roomService } from '@/services/room';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, userName } = body;
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const count = roomService.joinRoom(userId, userName);
    return NextResponse.json({ success: true, activeUsers: count });
  } catch (error) {
    return NextResponse.json({ error: 'Join failed' }, { status: 500 });
  }
}
