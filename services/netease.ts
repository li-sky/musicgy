// @ts-ignore
import { search, song_url, song_url_v1, song_url_match, song_detail, login_qr_key, login_qr_create, login_qr_check, login_status, artist_album, album } from '@neteasecloudmusicapienhanced/api';
import { Readable } from 'stream';
import redis from '@/lib/redis';
import { storageService } from './storage';

const COOKIE_KEY = 'netease:cookie';

export const neteaseService = {
  async setCookie(cookie: string) {
    await redis.set(COOKIE_KEY, cookie);
  },

  async getCookie() {
    return (await redis.get(COOKIE_KEY)) || '';
  },

  async search(query: string, type: number = 1, limit: number = 20, offset: number = 0) {
    const cookie = await this.getCookie();
    const res = await search({ keywords: query, type, limit, offset, cookie }) as any;
    
    // Handle different search types
    if (type === 1) { // Songs
      return (res.body?.result?.songs || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        artist: s.artists?.[0]?.name || 'Unknown',
        album: s.album?.name || 'Unknown',
        cover: s.album?.artist?.img1v1Url || '', // Search result songs often don't have good covers, fallback or fetch detail might be needed
        duration: (s.duration || 0) / 1000,
        addedBy: 'system',
        type: 'song'
      }));
    } else if (type === 10) { // Albums
      return (res.body?.result?.albums || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        artist: a.artist?.name || 'Unknown',
        cover: a.picUrl || '',
        publishTime: a.publishTime,
        size: a.size,
        type: 'album'
      }));
    } else if (type === 100) { // Artists
      return (res.body?.result?.artists || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        cover: a.picUrl || a.img1v1Url || '',
        albumSize: a.albumSize,
        type: 'artist'
      }));
    }
    
    return [];
  },

  async getArtistAlbums(id: number, limit: number = 20, offset: number = 0) {
    const cookie = await this.getCookie();
    const res = await artist_album({ id, limit, offset, cookie }) as any;
    return (res.body?.hotAlbums || []).map((a: any) => ({
      id: a.id,
      name: a.name,
      artist: a.artist?.name || 'Unknown',
      cover: a.picUrl || '',
      publishTime: a.publishTime,
      size: a.size,
      type: 'album'
    }));
  },

  async getAlbum(id: number) {
    const cookie = await this.getCookie();
    const res = await album({ id, cookie }) as any;
    const songs = (res.body?.songs || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      artist: s.ar?.[0]?.name || 'Unknown',
      album: s.al?.name || 'Unknown',
      cover: s.al?.picUrl || '',
      duration: (s.dt || 0) / 1000,
      addedBy: 'system',
      type: 'song'
    }));
    return {
      album: {
        id: res.body?.album?.id,
        name: res.body?.album?.name,
        cover: res.body?.album?.picUrl,
        artist: res.body?.album?.artist?.name,
        description: res.body?.album?.description,
      },
      songs
    };
  },

  async getSongDetail(id: number) {
    const cookie = await this.getCookie();
    const res = await song_detail({ ids: id.toString(), cookie }) as any;
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
    let cookie = await this.getCookie();
    if (!cookie.includes('os=pc')) {
        cookie = `${cookie}; os=pc`;
    }
    
    // Request Hi-Res audio (jymaster = Ultra High Quality Master)
    // Falls back to lower quality automatically by the API usually
    const res = await song_url_v1({ id, cookie, level: 'jymaster' } as any) as any;
    
    let data = res.body?.data?.[0];
    
    // Check if blocked or trial
    // freeTrialInfo populates if user doesn't have rights to full song
    if (!data?.url || data?.freeTrialInfo) {
       console.log(`[Netease] Song ${id} blocked/trial. Attempting unblock...`);
       try {
           const matchRes = await song_url_match({ id, cookie } as any) as any;
           // song_url_match returns a similar structure or just payload data depending on version
           // Let's inspect typical unblock response
           const matchData = matchRes.body?.data?.[0] || matchRes.body?.data;
           
           if (matchData?.url) {
               console.log(`[Netease] Unblock success for ${id}`);
               return {
                   url: matchData.url,
                   time: matchData.time || data?.time || 0,
                   size: matchData.size || data?.size || 0,
                   level: matchData.level || 'standard',
                   br: matchData.br || 0
               };
           }
       } catch (e) {
           console.error(`[Netease] Unblock failed for ${id}`, e);
       }
    }

    const url = data?.url || res.body?.url;
    if (!url) return null;

    return {
      url,
      time: data?.time || 0,
      size: data?.size || 0,
      level: data?.level || 'standard',
      br: data?.br || 0
    };
  },

  async downloadAndCacheSong(id: number) {
    if (storageService.exists(id)) return true;

    try {
      const info = await this.getSongUrl(id);
      if (!info?.url) return false;

      const headers: any = {
        'Referer': 'https://music.163.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      };

      const res = await fetch(info.url, { headers });
      if (!res.ok || !res.body) return false;

      await storageService.save(id, res.body);
      console.log(`[Netease] Cached song ${id}`);
      return true;
    } catch (e) {
      console.error(`[Netease] Failed to cache song ${id}`, e);
      return false;
    }
  },

  async getCoverUrl(id: number) {
    const cookie = await this.getCookie();
    // Get song details which includes cover URL
    const res = await song_detail({ ids: id.toString(), cookie }) as any;
    return res.body?.songs?.[0]?.al?.picUrl || '';
  },

  async proxyAudio(url: string, res: any, rangeHeader?: string) {
    // ... proxy logic doesn't need cookie as it fetches from URL directly ...
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
    const cookie = await this.getCookie();
    const result = await login_status({ cookie }) as any;
    return result.body;
  }
};
