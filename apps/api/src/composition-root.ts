import { EnqueueNotification, GetNotification } from '@mensageria/core';
import Redis from 'ioredis';
import type { Env } from './config/env.js';
import { createDb } from './infra/db/client.js';
import { PostgresNotificationRepository } from './infra/db/notification-repository.js';
import { createRabbit } from './infra/messaging/connection.js';
import { RabbitEventPublisher } from './infra/messaging/event-publisher.js';
import { RedisIdempotencyStore } from './infra/redis/idempotency-store.js';
import { SystemClock } from './infra/system-clock.js';
import { UuidGenerator } from './infra/uuid-generator.js';
import type { AppDependencies } from './http/dependencies.js';

export interface Container {
  deps: AppDependencies;
  dispose(): Promise<void>;
}

export async function createContainer(env: Env): Promise<Container> {
  const db = createDb(env.DATABASE_URL);
  const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  const rabbit = await createRabbit(env.RABBITMQ_URL);

  const notifications = new PostgresNotificationRepository(db);
  const idempotency = new RedisIdempotencyStore(redis, env.IDEMPOTENCY_TTL_SECONDS);
  const publisher = new RabbitEventPublisher(rabbit.channel);

  const enqueue = new EnqueueNotification({
    notifications,
    publisher,
    idempotency,
    clock: new SystemClock(),
    ids: new UuidGenerator(),
  });
  const getNotification = new GetNotification({ notifications });

  return {
    deps: { enqueue, getNotification },
    dispose: async () => {
      await rabbit.close();
      redis.disconnect();
      await db.destroy();
    },
  };
}
