import Redis, { type RedisOptions } from 'ioredis';

export function createRedis(url: string, options: RedisOptions = {}): Redis {
  return new Redis(url, { maxRetriesPerRequest: null, ...options });
}

export type RedisClient = Redis;
