import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RabbitMQContainer, type StartedRabbitMQContainer } from '@testcontainers/rabbitmq';
import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';
import { Notification } from '@mensageria/core';
import {
  createDb,
  migrateToLatest,
  NOTIFICATIONS_EXCHANGE,
  NOTIFICATION_QUEUED_ROUTING_KEY,
  PostgresNotificationRepository,
} from '@mensageria/infra';
import { type ChannelModel, connect, type Channel } from 'amqplib';
import { MongoClient } from 'mongodb';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadEnv } from './config/env.js';
import { startWorker } from './composition-root.js';
import { DLQ } from './messaging/topology.js';

let pg: StartedPostgreSqlContainer;
let rabbit: StartedRabbitMQContainer;
let mongo: StartedTestContainer;
let connection: ChannelModel;
let channel: Channel;
let databaseUrl: string;
let rabbitUrl: string;
let mongoUrl: string;

function envWith(overrides: Record<string, string>): NodeJS.ProcessEnv {
  return {
    DATABASE_URL: databaseUrl,
    RABBITMQ_URL: rabbitUrl,
    MONGO_URL: mongoUrl,
    MONGO_DB: 'mensageria',
    ...overrides,
  };
}

async function seedQueued(): Promise<string> {
  const db = createDb(databaseUrl);
  const repo = new PostgresNotificationRepository(db);
  const id = randomUUID();
  await repo.save(
    Notification.create({
      id,
      data: { channel: 'email', to: 'ana@example.com', subject: 'oi', body: 'corpo' },
      now: new Date(),
    }),
  );
  await db.destroy();
  return id;
}

function publishEvent(id: string): void {
  channel.publish(
    NOTIFICATIONS_EXCHANGE,
    NOTIFICATION_QUEUED_ROUTING_KEY,
    Buffer.from(JSON.stringify({ notificationId: id, channel: 'email' })),
    { persistent: true },
  );
}

async function waitFor<T>(fn: () => Promise<T | null | undefined>, timeoutMs = 20_000): Promise<T> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const value = await fn();
    if (value) return value;
    await sleep(200);
  }
  throw new Error('timeout aguardando condição');
}

async function statusOf(id: string): Promise<string | null> {
  const db = createDb(databaseUrl);
  const repo = new PostgresNotificationRepository(db);
  const found = await repo.findById(id);
  await db.destroy();
  return found ? found.status : null;
}

describe('Worker de entregas (integração)', () => {
  beforeAll(async () => {
    [pg, rabbit, mongo] = await Promise.all([
      new PostgreSqlContainer('postgres:16-alpine').withStartupTimeout(120_000).start(),
      new RabbitMQContainer('rabbitmq:3-management-alpine').withStartupTimeout(120_000).start(),
      new GenericContainer('mongo:7')
        .withExposedPorts(27017)
        .withWaitStrategy(Wait.forLogMessage(/Waiting for connections/i))
        .withStartupTimeout(120_000)
        .start(),
    ]);
    databaseUrl = pg.getConnectionUri();
    rabbitUrl = rabbit.getAmqpUrl();
    mongoUrl = `mongodb://${mongo.getHost()}:${mongo.getMappedPort(27017)}`;

    const db = createDb(databaseUrl);
    await migrateToLatest(db);
    await db.destroy();

    connection = await connect(rabbitUrl);
    channel = await connection.createChannel();
  });

  afterAll(async () => {
    if (channel) await channel.close();
    if (connection) await connection.close();
    await Promise.all([pg?.stop(), rabbit?.stop(), mongo?.stop()]);
  });

  it('entrega com sucesso e grava o delivery log no Mongo', async () => {
    const worker = await startWorker(loadEnv(envWith({ PROVIDER_FAILURE_RATE: '0' })));
    const id = await seedQueued();
    try {
      publishEvent(id);

      await waitFor(async () => ((await statusOf(id)) === 'delivered' ? true : null));

      const client = new MongoClient(mongoUrl);
      await client.connect();
      const log = await client
        .db('mensageria')
        .collection('delivery_logs')
        .findOne({ notificationId: id, outcome: 'delivered' });
      await client.close();
      expect(log).not.toBeNull();
    } finally {
      await worker.dispose();
    }
  });

  it('esgota as tentativas e envia para a DLQ quando o provider sempre falha', async () => {
    const worker = await startWorker(
      loadEnv(
        envWith({
          PROVIDER_FAILURE_RATE: '1',
          MAX_ATTEMPTS: '2',
          RETRY_BASE_MS: '100',
          RETRY_MAX_MS: '200',
          CIRCUIT_FAILURE_THRESHOLD: '100',
        }),
      ),
    );
    const id = await seedQueued();
    try {
      publishEvent(id);

      const message = await waitFor(async () => {
        const got = await channel.get(DLQ, { noAck: true });
        if (!got) return null;
        const payload = JSON.parse(got.content.toString()) as { notificationId: string };
        return payload.notificationId === id ? payload : null;
      });

      expect(message.notificationId).toBe(id);
      expect(await statusOf(id)).toBe('failed');
    } finally {
      await worker.dispose();
    }
  });
});
