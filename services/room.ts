import redis from '@/lib/redis';
import { neteaseService } from './netease';
import { storageService } from './storage';

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

// Redis Keys
const K = {
  QUEUE: 'room:queue',
  CURRENT: 'room:current',
  START_TIME: 'room:start_time',
  SKIP_VOTES: 'room:votes',
  USERS: 'room:users',
  USER_PREFIX: 'user:',
};

const USER_TIMEOUT = 60; // seconds

let lastNeteaseCheck = 0;
let cachedNeteaseStatus: any = null;

export const roomService = {
  async getState() {
    await this.checkAutoPlay();

    // Check Netease status every 30 seconds
    if (Date.now() - lastNeteaseCheck > 30000) {
      neteaseService.getStatus().then(status => {
        cachedNeteaseStatus = status;
        lastNeteaseCheck = Date.now();
      }).catch(() => {});
    }

    const [currentStr, queueStrs, startTimeStr, votes, userIds] = await Promise.all([
      redis.get(K.CURRENT),
      redis.lrange(K.QUEUE, 0, -1),
      redis.get(K.START_TIME),
      redis.smembers(K.SKIP_VOTES),
      redis.smembers(K.USERS)
    ]);

    const currentSong = currentStr ? JSON.parse(currentStr) : null;
    const queue = queueStrs.map(s => JSON.parse(s));
    const startTime = startTimeStr ? parseInt(startTimeStr) : 0;

    const activeUsers: { userId: string; nickname?: string; emailHash?: string }[] = [];
    
    if (userIds.length > 0) {
      const pipeline = redis.pipeline();
      userIds.forEach(id => {
        pipeline.exists(`${K.USER_PREFIX}${id}:heartbeat`);
        pipeline.hgetall(`${K.USER_PREFIX}${id}:profile`);
      });
      
      const results = await pipeline.exec();
      const deadUsers: string[] = [];

      if (results) {
        userIds.forEach((id, index) => {
          const exists = results[index * 2]?.[1];
          const profile = results[index * 2 + 1]?.[1] as any;

          if (exists) {
            activeUsers.push({
              userId: id,
              nickname: profile?.nickname,
              emailHash: profile?.emailHash
            });
          } else {
            deadUsers.push(id);
          }
        });
      }

      if (deadUsers.length > 0) {
        const p = redis.pipeline();
        p.srem(K.USERS, ...deadUsers);
        deadUsers.forEach(id => p.srem(K.SKIP_VOTES, id));
        p.exec().catch(e => console.error("Cleanup error", e));
      }
    }

    return {
      currentSong,
      queue,
      startTime,
      isPlaying: !!currentSong,
      votes: votes.length,
      requiredVotes: Math.max(1, Math.ceil(activeUsers.length / 2)),
      activeUsers,
      serverTime: Date.now(),
      neteaseStatus: cachedNeteaseStatus
    };
  },

  async checkAutoPlay() {
    const [currentStr, startTimeStr, queueLen] = await Promise.all([
      redis.get(K.CURRENT),
      redis.get(K.START_TIME),
      redis.llen(K.QUEUE)
    ]);

    if (currentStr) {
      const song = JSON.parse(currentStr);
      const startTime = parseInt(startTimeStr || '0');
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed > song.duration + 2) {
        await this.playNext();
      }
    } else if (queueLen > 0) {
      await this.playNext();
    }
  },

  async playNext(retryCount = 0) {
    const lockKey = 'room:lock:playing';
    const acquired = await redis.set(lockKey, '1', 'EX', 10, 'NX');
    if (!acquired && retryCount === 0) return;

    try {
      if (retryCount > 5) {
        await redis.del(K.CURRENT);
        return;
      }

      const nextSongStr = await redis.lpop(K.QUEUE);
      if (!nextSongStr) {
        await redis.del(K.CURRENT);
        return;
      }

      const nextSong = JSON.parse(nextSongStr);
      try {
        const songInfo = await neteaseService.getSongUrl(nextSong.id);
        if (!songInfo || !songInfo.url) return this.playNext(retryCount + 1);

        const pipeline = redis.pipeline();
        pipeline.set(K.CURRENT, JSON.stringify({ 
          ...nextSong, 
          url: songInfo.url,
          level: songInfo.level,
          br: songInfo.br,
          size: songInfo.size
        }));
        pipeline.set(K.START_TIME, Date.now());
        pipeline.del(K.SKIP_VOTES);
        await pipeline.exec();

        // Trigger cache/prefetch logic
        if (storageService.isEnabled) {
          // 1. Ensure current song is cached (start downloading if not already)
          neteaseService.downloadAndCacheSong(nextSong.id).catch(err => 
            console.error(`[Preload] Failed to cache current song ${nextSong.id}`, err)
          );

          // 2. Peek at next song and pre-fetch
          const headOfQueueStr = await redis.lindex(K.QUEUE, 0);
          if (headOfQueueStr) {
             const headOfQueue = JSON.parse(headOfQueueStr);
             console.log(`[Preload] Prefetching next song: ${headOfQueue.id}`);
             neteaseService.downloadAndCacheSong(headOfQueue.id).catch(err => 
               console.error(`[Preload] Failed to prefetch ${headOfQueue.id}`, err)
             );
          }
        }
      } catch (e) {
        return this.playNext(retryCount + 1);
      }
    } finally {
      await redis.del(lockKey);
    }
  },

  async addToQueue(songId: number, userId: string) {
    const details = await neteaseService.getSongDetail(songId);
    if (!details) throw new Error("Song not found");
    await redis.rpush(K.QUEUE, JSON.stringify({ ...details, addedBy: userId }));
    this.checkAutoPlay().catch(console.error);
  },

  async voteSkip(userId: string) {
    const isMember = await redis.sismember(K.SKIP_VOTES, userId);
    if (isMember) await redis.srem(K.SKIP_VOTES, userId);
    else await redis.sadd(K.SKIP_VOTES, userId);

    const [votes, users] = await Promise.all([
      redis.scard(K.SKIP_VOTES),
      redis.scard(K.USERS)
    ]);
    
    if (votes >= Math.max(1, Math.ceil(users / 2))) {
      await this.playNext();
      return true;
    }
    return false;
  },

  async getCurrentSong() {
    const currentStr = await redis.get(K.CURRENT);
    return currentStr ? JSON.parse(currentStr) : null;
  },

  async joinRoom(userId: string, userName?: string, connectionId?: string) {
    const pipeline = redis.pipeline();
    pipeline.sadd(K.USERS, userId);
    pipeline.set(`${K.USER_PREFIX}${userId}:heartbeat`, Date.now(), 'EX', USER_TIMEOUT);
    if (userName) pipeline.hset(`${K.USER_PREFIX}${userId}:profile`, { nickname: userName });
    if (connectionId) pipeline.sadd(`${K.USER_PREFIX}${userId}:conns`, connectionId);
    await pipeline.exec();
    return await redis.scard(K.USERS);
  },

  async leaveRoom(userId: string, connectionId?: string) {
    if (connectionId) {
      await redis.srem(`${K.USER_PREFIX}${userId}:conns`, connectionId);
      const remaining = await redis.scard(`${K.USER_PREFIX}${userId}:conns`);
      if (remaining > 0) return await redis.scard(K.USERS);
    }

    const pipeline = redis.pipeline();
    pipeline.srem(K.USERS, userId);
    pipeline.del(`${K.USER_PREFIX}${userId}:heartbeat`);
    pipeline.del(`${K.USER_PREFIX}${userId}:conns`);
    pipeline.srem(K.SKIP_VOTES, userId);
    await pipeline.exec();
    return await redis.scard(K.USERS);
  },

  async heartbeat(userId: string, userName?: string) {
    const pipeline = redis.pipeline();
    pipeline.set(`${K.USER_PREFIX}${userId}:heartbeat`, Date.now(), 'EX', USER_TIMEOUT);
    pipeline.sadd(K.USERS, userId);
    if (userName) pipeline.hset(`${K.USER_PREFIX}${userId}:profile`, { nickname: userName });
    await pipeline.exec();
  },

  async setProfile(userId: string, nickname?: string, emailHash?: string) {
    const update: any = {};
    if (nickname) update.nickname = nickname;
    if (emailHash) update.emailHash = emailHash;
    if (Object.keys(update).length > 0) await redis.hset(`${K.USER_PREFIX}${userId}:profile`, update);
    
    const userIds = await redis.smembers(K.USERS);
    const pipeline = redis.pipeline();
    userIds.forEach(id => {
        if (id !== userId) pipeline.hget(`${K.USER_PREFIX}${id}:profile`, 'emailHash');
    });
    const results = await pipeline.exec();
    return results?.map(r => r[1]).filter(Boolean) as string[] || [];
  },

  cleanupInactiveUsers() {},
  async getUserCount() { return await redis.scard(K.USERS); }
};