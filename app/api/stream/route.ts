import { NextRequest, NextResponse } from 'next/server';
import { roomService } from '@/services/room';
import { neteaseService } from '@/services/netease';
import { Readable } from 'stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const songId = searchParams.get('id');
    
    if (!songId) {
      return NextResponse.json({ error: 'songId required' }, { status: 400 });
    }

    const current = roomService.getCurrentSong();
    
    let url = current?.id === Number(songId) ? current.url : null;
    if (!url) {
      url = await neteaseService.getSongUrl(Number(songId));
    }
    
    if (!url) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    
    // Get Range header for seeking
    const rangeHeader = request.headers.get('range');
    
    const headers: any = {
      'Referer': 'https://music.163.com/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    };

    // Handle Range requests for seeking
    if (rangeHeader) {
      headers['Range'] = rangeHeader;
    }

    const audioRes = await fetch(url, { headers });

    if (!audioRes.ok) {
      throw new Error(`Upstream error: ${audioRes.status}`);
    }

    // Forward content headers
    const contentType = audioRes.headers.get('content-type');
    const contentLength = audioRes.headers.get('content-length');
    const contentRange = audioRes.headers.get('content-range');
    const acceptRanges = audioRes.headers.get('accept-ranges');
    
    const responseHeaders: Record<string, string> = {};
    if (contentType) responseHeaders['Content-Type'] = contentType;
    if (contentLength) responseHeaders['Content-Length'] = contentLength;
    if (contentRange) responseHeaders['Content-Range'] = contentRange;
    if (acceptRanges) responseHeaders['Accept-Ranges'] = acceptRanges;
    
    // Set appropriate status for range requests
    const status = rangeHeader && contentRange ? 206 : 200;
    
    // Convert web stream to Node.js readable stream and return
    if (audioRes.body) {
      // Convert Web Stream to Node Stream
      const nodeStream = Readable.fromWeb(audioRes.body as any);
      const chunks: Uint8Array[] = [];
      
      for await (const chunk of nodeStream) {
        chunks.push(chunk);
      }
      
      const buffer = Buffer.concat(chunks);
      
      return new NextResponse(buffer, {
        status,
        headers: responseHeaders,
      });
    } else {
      return new NextResponse(null, { status: 204 });
    }
  } catch (error) {
    console.error('Stream error:', error);
    return NextResponse.json({ error: 'Stream error' }, { status: 500 });
  }
}
