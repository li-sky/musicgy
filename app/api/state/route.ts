import { NextResponse } from 'next/server';
import { roomService } from '@/services/room';

export async function GET() {
  try {
    const state = roomService.getState();
    // Add server timestamp for better sync
    return NextResponse.json({
      ...state,
      serverTime: Date.now()
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get state' }, { status: 500 });
  }
}
