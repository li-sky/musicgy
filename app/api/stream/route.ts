import { NextRequest, NextResponse } from 'next/server';
import { roomService } from '@/services/room';
import { neteaseService } from '@/services/netease';
import { storageService } from '@/services/storage';
import { Readable } from 'stream';
// @ts-ignore
import { stat } from 'fs/promises';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const songId = searchParams.get('id');
    
    if (!songId) {
      return NextResponse.json({ error: 'songId required' }, { status: 400 });
    }

    const id = Number(songId);

    // --- Server-side Disk Cache Strategy ---
    if (storageService.isEnabled) {
        let exists = storageService.exists(id);
        if (!exists) {
            console.log(`[Stream] Cache miss for ${id}, downloading...`);
            const success = await neteaseService.downloadAndCacheSong(id);
            if (success) exists = true;
        }

        if (exists) {
            const metadata = await storageService.getMetadata(id);
            const contentType = metadata?.contentType || 'audio/mpeg';
            
            console.log(`[Stream] Serving ${id} from cache (${contentType})`);
            const rangeHeader = request.headers.get('range');
            const fileSize = await storageService.getFileSize(id);
            
            // Handle Range requests
            let start = 0;
            let end = fileSize - 1;
            let status = 200;
            const headers: Record<string, string> = {
                'Content-Type': contentType,
                'Accept-Ranges': 'bytes',
                'Content-Length': fileSize.toString()
            };

            if (rangeHeader) {
                const parts = rangeHeader.replace(/bytes=/, "").split("-");
                start = parseInt(parts[0], 10);
                end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                
                if (start >= fileSize) {
                    return new NextResponse(null, { 
                        status: 416, 
                        headers: { 'Content-Range': `bytes */${fileSize}` } 
                    });
                }

                status = 206;
                headers['Content-Range'] = `bytes ${start}-${end}/${fileSize}`;
                headers['Content-Length'] = (end - start + 1).toString();
            }

            const fileStream = storageService.getReadStream(id, { start, end });
            if (!fileStream) return NextResponse.json({ error: 'Read error' }, { status: 500 });

            // Convert Node stream to Web stream for NextResponse
            // @ts-ignore
            const webStream = Readable.toWeb(fileStream);
            
            return new NextResponse(webStream as any, { status, headers });
        }
    }
    // ---------------------------------------

    const current = await roomService.getCurrentSong();
    
    let url = current?.id === Number(songId) ? current.url : null;
    if (!url) {
      url = (await neteaseService.getSongUrl(Number(songId)))?.url;
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
      return new NextResponse(audioRes.body as any, {
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
