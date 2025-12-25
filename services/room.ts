import { neteaseService } from './netease';

interface Song {
  id: number;
  name: string;
  artist: string;
  album: string;
  cover: string;
  duration: number;
  url?: string;
  addedBy: string;
}

interface UserHeartbeat {
  userId: string;
  lastSeen: number;
}

interface RoomState {
  currentSong: Song | null;
  queue: Song[];
  startTime: number;
  skipVotes: Set<string>;
  activeUsers: Set<string>;
  userHeartbeats: Map<string, number>; // userId -> timestamp
}

const state: RoomState = {
  currentSong: null,
  queue: [],
  startTime: 0,
  skipVotes: new Set(),
  activeUsers: new Set(),
  userHeartbeats: new Map(),
};

const USER_TIMEOUT = 30000; // 30 seconds timeout
const CLEANUP_INTERVAL = 10000; // Check every 10 seconds

export const roomService = {
  getState() {
    // Auto-advance logic
    if (state.currentSong) {
      const elapsed = (Date.now() - state.startTime) / 1000;
      // Add 2 second buffer before skipping
      if (elapsed > state.currentSong.duration + 2) {
        this.playNext();
      }
    } else if (state.queue.length > 0) {
      this.playNext();
    }

    // Log queue state for debugging
    if (state.queue.length > 0) {
      console.log(`Queue state: ${state.queue.length} songs`, state.queue.map(s => s.name));
    }

    return {
      currentSong: state.currentSong,
      queue: state.queue,
      startTime: state.startTime,
      isPlaying: !!state.currentSong, // Always playing if song exists
      votes: state.skipVotes.size,
      requiredVotes: Math.ceil(state.activeUsers.size / 2),
      activeUsers: Array.from(state.activeUsers)
    };
  },

  async playNext(retryCount = 0) {
    // Prevent infinite recursion if entire queue is broken
    if (retryCount > 5) {
      console.error("Too many failed attempts to play next song. Pausing.");
      state.currentSong = null;
      return;
    }

    if (state.queue.length > 0) {
      const nextSong = state.queue.shift()!;
      try {
        // Fetch URL immediately before playing
        const url = await neteaseService.getSongUrl(nextSong.id);
        if (!url) {
          console.error("No URL for song", nextSong.id);
          return this.playNext(retryCount + 1);
        }

        // Store the upstream URL in state, but clients will access via /api/stream
        state.currentSong = { ...nextSong, url };
        state.startTime = Date.now();
        state.skipVotes.clear();
      } catch (e) {
        console.error("Play Next Error", e);
        this.playNext(retryCount + 1);
      }
    } else {
      state.currentSong = null;
    }
  },

  async addToQueue(songId: number, userId: string) {
    const details = await neteaseService.getSongDetail(songId);
    if (!details) throw new Error("Song not found");

    const song: Song = { ...details, addedBy: userId };
    
    if (!state.currentSong) {
      state.queue.push(song);
      await this.playNext();
    } else {
      state.queue.push(song);
    }
  },

  voteSkip(userId: string) {
    if (!state.currentSong) return;
    if (state.skipVotes.has(userId)) state.skipVotes.delete(userId);
    else state.skipVotes.add(userId);

    if (state.skipVotes.size >= Math.ceil(state.activeUsers.size / 2)) {
      this.playNext();
      return true;
    }
    return false;
  },
  
  getCurrentSong() {
    return state.currentSong;
  },

  joinRoom(userId: string, userName?: string) {
    if (!state.activeUsers.has(userId)) {
      state.activeUsers.add(userId);
      state.userHeartbeats.set(userId, Date.now());
      const displayName = userName || `User-${userId.substr(0, 8)}`;
      console.log(`User ${displayName} (${userId}) joined room. Active users: ${state.activeUsers.size}`);
    }
    return state.activeUsers.size;
  },

  leaveRoom(userId: string) {
    if (state.activeUsers.has(userId)) {
      state.activeUsers.delete(userId);
      state.userHeartbeats.delete(userId);
      // Also remove their votes
      state.skipVotes.delete(userId);
      console.log(`User ${userId} left room. Active users: ${state.activeUsers.size}`);
    }
    return state.activeUsers.size;
  },

  heartbeat(userId: string, userName?: string) {
    if (state.activeUsers.has(userId)) {
      state.userHeartbeats.set(userId, Date.now());
      // Optional: Log heartbeat with name for debugging
      if (userName) {
        console.log(`Heartbeat from ${userName} (${userId})`);
      }
    } else {
      // Auto-join on heartbeat if not present
      this.joinRoom(userId, userName);
    }
  },

  // Cleanup inactive users
  cleanupInactiveUsers() {
    const now = Date.now();
    let removedCount = 0;
    
    for (const [userId, lastSeen] of state.userHeartbeats.entries()) {
      if (now - lastSeen > USER_TIMEOUT) {
        console.log(`User ${userId} timed out (inactive for ${(now - lastSeen)/1000}s)`);
        this.leaveRoom(userId);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      console.log(`Cleaned up ${removedCount} inactive users. Active users: ${state.activeUsers.size}`);
    }
  },

  // Get user count for display
  getUserCount() {
    return state.activeUsers.size;
  }
};

// Start automatic cleanup interval
setInterval(() => {
  roomService.cleanupInactiveUsers();
}, CLEANUP_INTERVAL);
