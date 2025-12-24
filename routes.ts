import express from 'express';
import { Readable } from 'stream';
import { roomService } from './services/room.js';
import { neteaseService } from './services/netease.js';

const router = express.Router();

// Room
router.get('/state', (req, res) => {
  const state = roomService.getState();
  // Add server timestamp for better sync
  res.json({
    ...state,
    serverTime: Date.now()
  });
});

router.get('/search', async (req, res) => {
  try {
    const songs = await neteaseService.search(req.query.q as string);
    res.json({ songs });
  } catch (e) { res.status(500).json({ error: 'Search failed' }); }
});

router.post('/queue', async (req, res) => {
  try {
    await roomService.addToQueue(req.body.songId, req.body.userId);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Add failed' }); }
});

router.post('/vote-skip', (req, res) => {
  const skipped = roomService.voteSkip(req.body.userId);
  res.json({ skipped });
});

router.post('/join', (req, res) => {
  try {
    const userId = req.body.userId;
    const userName = req.body.userName || `User-${userId.substr(0, 8)}`;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    
    const count = roomService.joinRoom(userId, userName);
    res.json({ success: true, activeUsers: count });
  } catch (e) {
    res.status(500).json({ error: 'Join failed' });
  }
});

router.post('/leave', (req, res) => {
  try {
    const userId = req.body.userId;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    
    const count = roomService.leaveRoom(userId);
    res.json({ success: true, activeUsers: count });
  } catch (e) {
    res.status(500).json({ error: 'Leave failed' });
  }
});

router.post('/heartbeat', (req, res) => {
  try {
    const userId = req.body.userId;
    const userName = req.body.userName;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    
    roomService.heartbeat(userId, userName);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Heartbeat failed' });
  }
});

router.get('/cover', async (req, res) => {
  try {
    const songId = Number(req.query.id);
    if (!songId) return res.status(400).json({ error: 'songId required' });
    
    const coverUrl = await neteaseService.getCoverUrl(songId);
    if (!coverUrl) return res.status(404).json({ error: 'Cover not found' });
    
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
    if (contentType) res.setHeader('Content-Type', contentType);
    
    if (imageRes.body) {
      // @ts-ignore - Readable.fromWeb exists in Node 18+
      Readable.fromWeb(imageRes.body).pipe(res);
    } else {
      res.end();
    }
  } catch (e) {
    console.error('Cover Proxy Error:', e);
    if (!res.headersSent) res.status(502).send('Error fetching cover');
  }
});

// Audio Stream Proxy - Supports Range requests for seeking
router.get('/stream', async (req, res) => {
  const songId = Number(req.query.id);
  const current = roomService.getCurrentSong();
  
  try {
    let url = current?.id === songId ? current.url : null;
    if (!url) {
        url = await neteaseService.getSongUrl(songId);
    }
    
    if (!url) return res.status(404).send('Not found');
    
    // Get Range header for seeking
    const rangeHeader = req.headers.range;
    
    await neteaseService.proxyAudio(url, res, rangeHeader);
  } catch (e) {
    res.status(500).send('Stream error');
  }
});

// Auth
router.get('/auth/key', async (req, res) => res.json({ key: await neteaseService.getQrKey() }));
router.post('/auth/create', async (req, res) => res.json({ qrimg: await neteaseService.createQr(req.body.key) }));
router.post('/auth/check', async (req, res) => {
  const result = await neteaseService.checkQr(req.body.key);
  if (result.code === 803) neteaseService.setCookie(result.cookie);
  res.json(result);
});
router.get('/auth/status', async (req, res) => {
  const result = await neteaseService.getStatus();
  res.json({ 
    loggedIn: !!result.data?.profile, 
    profile: result.data?.profile ? {
      nickname: result.data.profile.nickname,
      avatarUrl: result.data.profile.avatarUrl,
      userId: result.data.profile.userId
    } : null 
  });
});

export default router;
