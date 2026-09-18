import { EnqueueNotification, GetNotification, ListNotifications } from '@mensageria/core';
import {
  createDb,
  createRabbit,
  createRedis,
  PostgresNotificationRepository,
  RabbitEventPublisher,
  RedisIdempotencyStore,
  SystemClock,
  UuidGenerator,
} from '@mensageria/infra';
import type { Env } from './config/env.js';
import type { AppDependencies } from './http/dependencies.js';

export interface Container {
  deps: AppDependencies;
  dispose(): Promise<void>;
}

export async function createContainer(env: Env): Promise<Container> {
  const db = createDb(env.DATABASE_URL);
  const redis = createRedis(env.REDIS_URL);
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
  const listNotifications = new ListNotifications({ notifications });

  return {
    deps: { enqueue, getNotification, listNotifications },
    dispose: async () => {
      await rabbit.close();
      redis.disconnect();
      await db.destroy();
    },
  };
}
