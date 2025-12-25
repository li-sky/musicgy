import { NextRequest, NextResponse } from 'next/server';
import { roomService } from '@/services/room';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const skipped = roomService.voteSkip(userId);
    return NextResponse.json({ skipped });
  } catch (error) {
    return NextResponse.json({ error: 'Vote skip failed' }, { status: 500 });
  }
}
