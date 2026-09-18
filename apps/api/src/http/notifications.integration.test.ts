import { setTimeout as sleep } from 'node:timers/promises';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RabbitMQContainer, type StartedRabbitMQContainer } from '@testcontainers/rabbitmq';
import { connect, type Channel } from 'amqplib';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createDb,
  migrateToLatest,
  NOTIFICATIONS_EXCHANGE,
  NOTIFICATION_QUEUED_ROUTING_KEY,
} from '@mensageria/infra';
import { loadEnv } from '../config/env.js';
import { createContainer, type Container } from '../composition-root.js';
import { buildServer } from './server.js';

const emailPayload = {
  channel: 'email',
  to: 'ana@example.com',
  subject: 'Bem-vinda',
  body: 'Olá!',
};

async function waitForMessage(channel: Channel, queue: string): Promise<Buffer> {
  for (let i = 0; i < 50; i += 1) {
    const message = await channel.get(queue, { noAck: true });
    if (message) return message.content;
    await sleep(100);
  }
  throw new Error('nenhuma mensagem recebida no RabbitMQ');
}

describe('API de notificações (integração)', () => {
  let pg: StartedPostgreSqlContainer;
  let redis: StartedTestContainer;
  let rabbit: StartedRabbitMQContainer;
  let container: Container;
  let app: FastifyInstance;
  let amqpUrl: string;

  beforeAll(async () => {
    [pg, redis, rabbit] = await Promise.all([
      new PostgreSqlContainer('postgres:16-alpine').withStartupTimeout(120_000).start(),
      new GenericContainer('redis:7-alpine')
        .withExposedPorts(6379)
        .withStartupTimeout(120_000)
        .start(),
      new RabbitMQContainer('rabbitmq:3-management-alpine').withStartupTimeout(120_000).start(),
    ]);
    amqpUrl = rabbit.getAmqpUrl();

    const env = loadEnv({
      DATABASE_URL: pg.getConnectionUri(),
      REDIS_URL: `redis://${redis.getHost()}:${redis.getMappedPort(6379)}`,
      RABBITMQ_URL: amqpUrl,
    });

    const db = createDb(env.DATABASE_URL);
    await migrateToLatest(db);
    await db.destroy();

    container = await createContainer(env);
    app = buildServer(container.deps);
    await app.ready();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (container) await container.dispose();
    await Promise.all([pg?.stop(), redis?.stop(), rabbit?.stop()]);
  });

  it('POST cria a notificação e retorna 202 com Location', async () => {
    const res = await app.inject({ method: 'POST', url: '/notifications', payload: emailPayload });

    expect(res.statusCode).toBe(202);
    const body = res.json();
    expect(body.status).toBe('queued');
    expect(res.headers.location).toBe(`/notifications/${body.id}`);
  });

  it('GET retorna a notificação persistida', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/notifications',
      payload: emailPayload,
    });
    const { id } = created.json();

    const res = await app.inject({ method: 'GET', url: `/notifications/${id}` });

    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(id);
  });

  it('POST inválido retorna 422', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/notifications',
      payload: { channel: 'email', to: 'invalido', subject: 'x', body: 'y' },
    });

    expect(res.statusCode).toBe(422);
    expect(res.json().error).toBe('ValidationError');
  });

  it('GET de id inexistente retorna 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/notifications/00000000-0000-0000-0000-000000000000',
    });

    expect(res.statusCode).toBe(404);
  });

  it('deduplica via Idempotency-Key: segunda chamada retorna 200 e mesmo id', async () => {
    const headers = { 'idempotency-key': 'chave-integração-1' };
    const first = await app.inject({
      method: 'POST',
      url: '/notifications',
      payload: emailPayload,
      headers,
    });
    const second = await app.inject({
      method: 'POST',
      url: '/notifications',
      payload: emailPayload,
      headers,
    });

    expect(first.statusCode).toBe(202);
    expect(second.statusCode).toBe(200);
    expect(second.json().id).toBe(first.json().id);
  });

  it('publica o evento notification.queued no RabbitMQ', async () => {
    const conn = await connect(amqpUrl);
    const channel = await conn.createChannel();
    await channel.assertExchange(NOTIFICATIONS_EXCHANGE, 'topic', { durable: true });
    const queue = await channel.assertQueue('', { exclusive: true });
    await channel.bindQueue(queue.queue, NOTIFICATIONS_EXCHANGE, NOTIFICATION_QUEUED_ROUTING_KEY);

    const created = await app.inject({
      method: 'POST',
      url: '/notifications',
      payload: emailPayload,
    });
    const { id } = created.json();

    const content = await waitForMessage(channel, queue.queue);
    const event = JSON.parse(content.toString()) as { notificationId: string; channel: string };
    expect(event).toEqual({ notificationId: id, channel: 'email' });

    await channel.close();
    await conn.close();
  });
});
