// @ts-ignore
import { search, song_url, song_detail, login_qr_key, login_qr_create, login_qr_check, login_status } from '@neteasecloudmusicapienhanced/api';
import { Readable } from 'stream';

let globalCookie = '';

export const neteaseService = {
  setCookie(cookie: string) {
    globalCookie = cookie;
  },

  getCookie() {
    return globalCookie;
  },

  async search(query: string) {
    const res = await search({ keywords: query, limit: 10, cookie: globalCookie }) as any;
    return (res.body?.result?.songs || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      artist: s.artists?.[0]?.name || 'Unknown',
      album: s.album?.name || 'Unknown',
      cover: s.album?.artist?.img1v1Url || '',
      duration: (s.duration || 0) / 1000,
      addedBy: 'system'
    }));
  },

  async getSongDetail(id: number) {
    const res = await song_detail({ ids: id.toString(), cookie: globalCookie }) as any;
    const s = res.body?.songs?.[0];
    if (!s) return null;
    return {
      id: s.id,
      name: s.name,
      artist: s.ar?.[0]?.name || 'Unknown',
      album: s.al?.name || 'Unknown',
      cover: s.al?.picUrl || '',
      duration: (s.dt || 0) / 1000,
    };
  },

  async getSongUrl(id: number) {
    // Request lossless audio
    const res = await song_url({ id, cookie: globalCookie, level: 'lossless' } as any) as any;
    return res.body?.data?.[0]?.url || res.body?.url;
  },

  async getCoverUrl(id: number) {
    // Get song details which includes cover URL
    const res = await song_detail({ ids: id.toString(), cookie: globalCookie }) as any;
    return res.body?.songs?.[0]?.al?.picUrl || '';
  },

  async proxyAudio(url: string, res: any, rangeHeader?: string) {
    try {
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
      
      if (contentType) res.setHeader('Content-Type', contentType);
      if (contentLength) res.setHeader('Content-Length', contentLength);
      if (contentRange) res.setHeader('Content-Range', contentRange);
      
      // Set appropriate status for range requests
      if (rangeHeader && contentRange) {
        res.status(206); // Partial Content
      } else {
        res.status(200);
      }
      
      // Convert Web Stream to Node Stream and pipe
      if (audioRes.body) {
        // @ts-ignore - Readable.fromWeb exists in Node 18+
        Readable.fromWeb(audioRes.body).pipe(res);
      } else {
        res.end();
      }
    } catch (e) {
      console.error('Audio Proxy Error:', e);
      if (!res.headersSent) res.status(502).send('Error fetching audio');
    }
  },

  // Auth
  async getQrKey() { return (await login_qr_key({}) as any).body.data.unikey; },
  async createQr(key: string) { return (await login_qr_create({ key, qrimg: true }) as any).body.data.qrimg; },
  async checkQr(key: string) { 
    const result = await login_qr_check({ key }) as any;
    return result.body;
  },
  async getStatus() { 
    const result = await login_status({ cookie: globalCookie }) as any;
    return result.body;
  }
};
