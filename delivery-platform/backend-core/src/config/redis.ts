import Redis from 'ioredis';

export const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'redis-cache',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  retryStrategy: (times) => Math.min(times * 100, 3000),
});

redisClient.on('connect', () => {
  console.log('⚡ Conexión exitosa a Redis');
});

redisClient.on('error', (err) => {
  console.error('Error en conexión con Redis:', err);
});
