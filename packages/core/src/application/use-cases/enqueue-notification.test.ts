import { beforeEach, describe, expect, it } from 'vitest';
import type { CreateNotification } from '@mensageria/contracts';
import { EnqueueNotification } from './enqueue-notification.js';
import {
  FixedClock,
  InMemoryIdempotencyStore,
  InMemoryNotificationRepository,
  RecordingEventPublisher,
  SequentialIdGenerator,
} from '../../testing/fakes.js';

const data: CreateNotification = {
  channel: 'email',
  to: 'ana@example.com',
  subject: 'Bem-vinda',
  body: 'Olá!',
};

describe('EnqueueNotification', () => {
  let notifications: InMemoryNotificationRepository;
  let publisher: RecordingEventPublisher;
  let idempotency: InMemoryIdempotencyStore;
  let useCase: EnqueueNotification;

  beforeEach(() => {
    notifications = new InMemoryNotificationRepository();
    publisher = new RecordingEventPublisher();
    idempotency = new InMemoryIdempotencyStore();
    useCase = new EnqueueNotification({
      notifications,
      publisher,
      idempotency,
      clock: new FixedClock(new Date('2026-09-17T00:00:00.000Z')),
      ids: new SequentialIdGenerator('n'),
    });
  });

  it('cria a notificação, persiste e publica o evento', async () => {
    const result = await useCase.execute({ data });

    expect(result.deduplicated).toBe(false);
    expect(result.notification.status).toBe('queued');
    expect(await notifications.findById(result.notification.id)).not.toBeNull();
    expect(publisher.events).toEqual([
      { notificationId: result.notification.id, channel: 'email' },
    ]);
  });

  it('deduplica requisições com a mesma Idempotency-Key', async () => {
    const first = await useCase.execute({ data, idempotencyKey: 'key-1' });
    const second = await useCase.execute({ data, idempotencyKey: 'key-1' });

    expect(second.deduplicated).toBe(true);
    expect(second.notification.id).toBe(first.notification.id);
    expect(publisher.events).toHaveLength(1);
  });

  it('trata chaves de idempotência distintas como notificações distintas', async () => {
    const first = await useCase.execute({ data, idempotencyKey: 'key-1' });
    const second = await useCase.execute({ data, idempotencyKey: 'key-2' });

    expect(second.notification.id).not.toBe(first.notification.id);
    expect(publisher.events).toHaveLength(2);
  });
});
