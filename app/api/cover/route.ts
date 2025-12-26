import { NextRequest, NextResponse } from 'next/server';
import { neteaseService } from '@/services/netease';
import { Readable } from 'stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const songId = searchParams.get('id');
  
  if (!songId) {
    return NextResponse.json({ error: 'songId required' }, { status: 400 });
  }

  const fetchWithRetry = async (url: string, options: any, retries = 2) => {
    for (let i = 0; i <= retries; i++) {
      try {
        const res = await fetch(url, options);
        if (res.ok) return res;
        if (i === retries) throw new Error(`Status ${res.status}`);
      } catch (err) {
        if (i === retries) throw err;
        // Wait a bit before retry
        await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
      }
    }
    throw new Error('Fetch failed after retries');
  };

  try {
    let coverUrl = null;
    let lastError = null;

    // Retry getting the cover URL from Netease service
    for (let i = 0; i < 3; i++) {
      try {
        coverUrl = await neteaseService.getCoverUrl(Number(songId));
        if (coverUrl) break;
      } catch (err) {
        lastError = err;
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    if (!coverUrl) {
      console.error('Failed to get cover URL for', songId, lastError);
      return NextResponse.json({ error: 'Cover not found' }, { status: 404 });
    }

    // Proxy the cover image with retry
    const imageRes = await fetchWithRetry(coverUrl, {
      headers: {
        'Referer': 'https://music.163.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

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
          'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
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
