import { NextResponse } from 'next/server';
import { neteaseService } from '@/services/netease';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await neteaseService.getStatus();
    return NextResponse.json({ 
      loggedIn: !!result.data?.profile, 
      profile: result.data?.profile ? {
        nickname: result.data.profile.nickname,
        avatarUrl: result.data.profile.avatarUrl,
        userId: result.data.profile.userId
      } : null 
    });
  } catch (error) {
    return NextResponse.json({ loggedIn: false, profile: null });
  }
}
