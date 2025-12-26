import { NextRequest, NextResponse } from 'next/server';
import { neteaseService } from '@/services/netease';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const id = parseInt(searchParams.get('id') || '0');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    if (!id || !type) {
      return NextResponse.json({ error: 'ID and Type parameters required' }, { status: 400 });
    }

    let results;
    if (type === 'artist') {
      results = await neteaseService.getArtistAlbums(id, limit, offset);
    } else if (type === 'album') {
      results = await neteaseService.getAlbum(id);
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Browse error:', error);
    return NextResponse.json({ error: 'Browse failed' }, { status: 500 });
  }
}
