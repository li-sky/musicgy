import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redis.on('error', (err) => {
  // Suppress connection errors to avoid console spam in dev if redis is not running
  // but log critical errors
  if ((err as any).code !== 'ECONNREFUSED') {
    console.error('Redis Error:', err);
  }
});

export default redis;
