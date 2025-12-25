// API Types
export interface Song {
  id: number;
  name: string;
  artist: string;
  album: string;
  cover: string;
  duration: number;
  addedBy: string;
}

export interface RoomState {
  currentSong: Song | null;
  queue: Song[];
  startTime: number;
  isPlaying: boolean;
  votes: number;
  requiredVotes: number;
  activeUsers: string[];
  serverTime?: number; // Added for better sync
}

export interface UserProfile {
    nickname: string;
    avatarUrl: string;
    userId: number;
}

const API_BASE = '/api';

export const api = {
  async getState(): Promise<RoomState> {
    const res = await fetch(`${API_BASE}/state`);
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
  },

  async search(query: string): Promise<Song[]> {
    const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Search failed');
    const data = await res.json();
    return data.songs;
  },

  async addToQueue(songId: number, userId: string): Promise<void> {
    await fetch(`${API_BASE}/queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songId, userId })
    });
  },

  async voteSkip(userId: string): Promise<void> {
    await fetch(`${API_BASE}/vote-skip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
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
      if (!res.ok) return { loggedIn: false };
      return await res.json();
  },

  async joinRoom(userId: string, userName?: string): Promise<void> {
    await fetch(`${API_BASE}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, userName })
    });
  },

  async leaveRoom(userId: string): Promise<void> {
    await fetch(`${API_BASE}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
  },

  async heartbeat(userId: string, userName?: string): Promise<void> {
    await fetch(`${API_BASE}/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, userName })
    });
  },

  getCoverUrl(songId: number) {
    return `${API_BASE}/cover?id=${songId}`;
  }
};
