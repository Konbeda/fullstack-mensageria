import type { IdempotencyStore } from '@mensageria/core';
import type Redis from 'ioredis';

export class RedisIdempotencyStore implements IdempotencyStore {
  constructor(
    private readonly redis: Redis,
    private readonly ttlSeconds: number,
  ) {}

  private key(key: string): string {
    return `idem:${key}`;
  }

  async findNotificationId(key: string): Promise<string | null> {
    return this.redis.get(this.key(key));
  }

  async remember(key: string, notificationId: string): Promise<void> {
    await this.redis.set(this.key(key), notificationId, 'EX', this.ttlSeconds);
  }
}
