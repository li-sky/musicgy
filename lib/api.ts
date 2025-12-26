// API Types
export interface Song {
  id: number;
  name: string;
  artist: string;
  album: string;
  cover: string;
  duration: number;
  addedBy: string;
  type?: 'song';
}

export interface Artist {
  id: number;
  name: string;
  cover: string;
  albumSize: number;
  type: 'artist';
}

export interface Album {
  id: number;
  name: string;
  artist: string;
  cover: string;
  publishTime: number;
  size: number;
  type: 'album';
  description?: string;
}

export type SearchResult = Song | Artist | Album;

export interface UserPresence {
  userId: string;
  nickname?: string;
  emailHash?: string;
}

export interface RoomState {
  currentSong: Song | null;
  queue: Song[];
  startTime: number;
  isPlaying: boolean;
  votes: number;
  requiredVotes: number;
  activeUsers: UserPresence[];
  serverTime?: number; // Added for better sync
  neteaseStatus?: any;
}

export interface UserProfile {
    nickname: string;
    avatarUrl: string;
    userId: number;
}

const API_BASE = '/api';

export const api = {
  async getState(userId?: string): Promise<RoomState> {
    const url = userId ? `${API_BASE}/state?userId=${encodeURIComponent(userId)}` : `${API_BASE}/state`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
  },

  async search(query: string, type: number = 1, limit: number = 20, offset: number = 0): Promise<SearchResult[]> {
    const params = new URLSearchParams({
      q: query,
      type: type.toString(),
      limit: limit.toString(),
      offset: offset.toString()
    });
    const res = await fetch(`${API_BASE}/search?${params.toString()}`);
    if (!res.ok) throw new Error('Search failed');
    const data = await res.json();
    return data.results || data.songs || [];
  },

  async browse(type: 'artist' | 'album', id: number, limit: number = 20, offset: number = 0): Promise<any> {
    const params = new URLSearchParams({
      type,
      id: id.toString(),
      limit: limit.toString(),
      offset: offset.toString()
    });
    const res = await fetch(`${API_BASE}/browse?${params.toString()}`);
    if (!res.ok) throw new Error('Browse failed');
    const data = await res.json();
    return data.results;
  },

  async addToQueue(songId: number, userId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId, userId })
    });
    if (!res.ok) throw new Error('Failed to add to queue');
  },

  async voteSkip(userId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/vote-skip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    if (!res.ok) throw new Error('Failed to vote skip');
  },

  getStreamUrl(songId: number) {
    return `${API_BASE}/stream?id=${songId}`;
  },

  // Auth
  async getQrKey() {
      const res = await fetch(`${API_BASE}/auth/key`);
      if (!res.ok) throw new Error('Failed to get QR key');
      return (await res.json()).key;
  },

  async createQr(key: string) {
      const res = await fetch(`${API_BASE}/auth/create`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ key })
      });
      if (!res.ok) throw new Error('Failed to create QR');
      return (await res.json()).qrimg;
  },

  async checkQr(key: string) {
      const res = await fetch(`${API_BASE}/auth/check`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ key })
      });
      if (!res.ok) throw new Error('Failed to check QR');
      return await res.json();
  },

  async getAuthStatus() {
      const res = await fetch(`${API_BASE}/auth/status`);
      if (!res.ok) throw new Error('Failed to get auth status');
      return await res.json();
  },

  async setProfile(userId: string, nickname?: string, email?: string) {
    const res = await fetch(`${API_BASE}/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, nickname, email })
    });
    if (!res.ok) throw new Error('Failed to set profile');
    return await res.json();
  },

  async joinRoom(userId: string, userName?: string, connectionId?: string): Promise<void> {
    const res = await fetch(`${API_BASE}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, userName, connectionId })
    });
    if (!res.ok) throw new Error('Failed to join room');
  },

  async leaveRoom(userId: string, connectionId?: string): Promise<void> {
    const res = await fetch(`${API_BASE}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, connectionId })
    });
    if (!res.ok) throw new Error('Failed to leave room');
  },

  async heartbeat(userId: string, userName?: string): Promise<void> {
    const res = await fetch(`${API_BASE}/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, userName })
    });
    if (!res.ok) throw new Error('Heartbeat failed');
  },

  getCoverUrl(songId: number) {
    return `${API_BASE}/cover?id=${songId}`;
  }
};
