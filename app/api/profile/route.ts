import { NextResponse } from 'next/server';
import { roomService } from '../../../services/room';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, nickname, email } = body;
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    let emailHash: string | undefined = undefined;
    if (email && typeof email === 'string') {
      const normalized = email.trim().toLowerCase();
      const hash = crypto.createHash('sha256').update(normalized).digest('hex');
      emailHash = hash;
    }

    const others = roomService.setProfile(userId, nickname, emailHash);

    return NextResponse.json({ others });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
