import { DeadLetterNotification, ProcessDelivery } from '@mensageria/core';
import {
  createDb,
  createRabbit,
  PostgresNotificationRepository,
  SystemClock,
} from '@mensageria/infra';
import type { Env } from './config/env.js';
import { DeliveryHandler } from './delivery-handler.js';
import { startHealthServer } from './health-server.js';
import { createMongo } from './infra/mongo/client.js';
import { MongoDeliveryLogRepository } from './infra/mongo/delivery-log-repository.js';
import { FakeNotificationProvider } from './infra/providers/fake-provider.js';
import { ChannelProviderRegistry } from './infra/providers/provider-registry.js';
import { startConsumer, type RunningConsumer } from './messaging/consumer.js';
import { assertWorkerTopology } from './messaging/topology.js';
import { exponentialBackoff } from './resilience/backoff.js';
import { CircuitBreaker, CircuitBreakerRegistry } from './resilience/circuit-breaker.js';

export interface Worker {
  consumer: RunningConsumer;
  dispose(): Promise<void>;
}

const logger = {
  warn: (obj: Record<string, unknown>, msg: string) => console.warn(msg, obj),
  error: (obj: Record<string, unknown>, msg: string) => console.error(msg, obj),
};

export async function startWorker(env: Env): Promise<Worker> {
  const db = createDb(env.DATABASE_URL);
  const rabbit = await createRabbit(env.RABBITMQ_URL);
  await assertWorkerTopology(rabbit.channel);
  const mongo = await createMongo(env.MONGO_URL, env.MONGO_DB);

  const notifications = new PostgresNotificationRepository(db);
  const deliveryLog = new MongoDeliveryLogRepository(mongo.db);
  const provider = new FakeNotificationProvider({ failureRate: env.PROVIDER_FAILURE_RATE });
  const providers = new ChannelProviderRegistry({ email: provider, sms: provider, push: provider });

  const clock = new SystemClock();
  const process = new ProcessDelivery({ notifications, providers, deliveryLog, clock });
  const deadLetter = new DeadLetterNotification({ notifications, clock });
  const breakers = new CircuitBreakerRegistry(
    () =>
      new CircuitBreaker({
        failureThreshold: env.CIRCUIT_FAILURE_THRESHOLD,
        resetMs: env.CIRCUIT_RESET_MS,
      }),
  );
  const handler = new DeliveryHandler({
    process,
    deadLetter,
    breakers,
    maxAttempts: env.MAX_ATTEMPTS,
    logger,
  });

  const consumer = await startConsumer({
    channel: rabbit.channel,
    handler,
    prefetch: env.PREFETCH,
    backoff: (attempt) => exponentialBackoff(attempt, env.RETRY_BASE_MS, env.RETRY_MAX_MS),
    logger,
  });
  const health = startHealthServer(env.HEALTH_PORT);

  return {
    consumer,
    dispose: async () => {
      await consumer.stop();
      health.close();
      await rabbit.close();
      await mongo.close();
      await db.destroy();
    },
  };
}
