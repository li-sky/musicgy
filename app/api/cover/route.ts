import { NextRequest, NextResponse } from 'next/server';
import { neteaseService } from '@/services/netease';
import { Readable } from 'stream';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const songId = searchParams.get('id');
    
    if (!songId) {
      return NextResponse.json({ error: 'songId required' }, { status: 400 });
    }

    const coverUrl = await neteaseService.getCoverUrl(Number(songId));
    if (!coverUrl) {
      return NextResponse.json({ error: 'Cover not found' }, { status: 404 });
    }

    // Proxy the cover image
    const imageRes = await fetch(coverUrl, {
      headers: {
        'Referer': 'https://music.163.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!imageRes.ok) {
      throw new Error(`Upstream error: ${imageRes.status}`);
    }

    const contentType = imageRes.headers.get('content-type');
    
    if (imageRes.body) {
      // Convert web stream to Node.js readable stream
      const nodeStream = Readable.fromWeb(imageRes.body as any);
      const chunks: Uint8Array[] = [];
      
      for await (const chunk of nodeStream) {
        chunks.push(chunk);
      }
      
      const buffer = Buffer.concat(chunks);
      
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType || 'image/jpeg',
        },
      });
    } else {
      return new NextResponse(null, { status: 204 });
    }
  } catch (error) {
    console.error('Cover Proxy Error:', error);
    return NextResponse.json({ error: 'Error fetching cover' }, { status: 502 });
  }
}
