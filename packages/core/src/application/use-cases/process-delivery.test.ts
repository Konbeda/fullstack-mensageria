import { beforeEach, describe, expect, it } from 'vitest';
import { NotificationNotFoundError } from '../../domain/errors.js';
import { Notification } from '../../domain/notification.js';
import { ProviderError } from '../ports/notification-provider.js';
import { ProcessDelivery } from './process-delivery.js';
import {
  FakeProvider,
  FixedClock,
  InMemoryDeliveryLogRepository,
  InMemoryNotificationRepository,
  StubProviderRegistry,
} from '../../testing/fakes.js';

const now = new Date('2026-09-17T00:00:00.000Z');

function build(provider: FakeProvider) {
  const notifications = new InMemoryNotificationRepository();
  const deliveryLog = new InMemoryDeliveryLogRepository();
  const useCase = new ProcessDelivery({
    notifications,
    providers: new StubProviderRegistry(provider),
    deliveryLog,
    clock: new FixedClock(now),
  });
  return { notifications, deliveryLog, useCase };
}

async function seedQueued(notifications: InMemoryNotificationRepository): Promise<string> {
  const n = Notification.create({
    id: 'n-1',
    data: { channel: 'email', to: 'ana@example.com', subject: 'oi', body: 'corpo' },
    now,
  });
  await notifications.save(n);
  return n.id;
}

describe('ProcessDelivery', () => {
  let provider: FakeProvider;

  beforeEach(() => {
    provider = new FakeProvider(() => ({ providerMessageId: 'msg-1' }));
  });

  it('entrega com sucesso e registra o log', async () => {
    const { notifications, deliveryLog, useCase } = build(provider);
    const id = await seedQueued(notifications);

    const result = await useCase.execute({ notificationId: id });

    expect(result).toEqual({ outcome: 'delivered', deduplicated: false });
    const stored = await notifications.findById(id);
    expect(stored?.status).toBe('delivered');
    expect(stored?.attempts).toBe(1);
    expect(deliveryLog.logs).toEqual([
      { notificationId: id, attempt: 1, outcome: 'delivered', providerMessageId: 'msg-1', at: now },
    ]);
  });

  it('marca como failed, loga e propaga o erro quando o provider falha', async () => {
    provider = new FakeProvider(() => {
      throw new ProviderError('provider fora do ar', true);
    });
    const { notifications, deliveryLog, useCase } = build(provider);
    const id = await seedQueued(notifications);

    await expect(useCase.execute({ notificationId: id })).rejects.toBeInstanceOf(ProviderError);

    const stored = await notifications.findById(id);
    expect(stored?.status).toBe('failed');
    expect(deliveryLog.logs[0]?.outcome).toBe('failed');
    expect(deliveryLog.logs[0]?.error).toBe('provider fora do ar');
  });

  it('é idempotente: consumo duplicado após entrega não reenvia', async () => {
    const { notifications, useCase } = build(provider);
    const id = await seedQueued(notifications);

    await useCase.execute({ notificationId: id });
    const second = await useCase.execute({ notificationId: id });

    expect(second.deduplicated).toBe(true);
    expect(provider.sent).toHaveLength(1);
  });

  it('permite retry após falha, incrementando as tentativas', async () => {
    let calls = 0;
    provider = new FakeProvider(() => {
      calls += 1;
      if (calls === 1) throw new ProviderError('falha transitória', true);
      return { providerMessageId: 'msg-2' };
    });
    const { notifications, useCase } = build(provider);
    const id = await seedQueued(notifications);

    await expect(useCase.execute({ notificationId: id })).rejects.toBeInstanceOf(ProviderError);
    const result = await useCase.execute({ notificationId: id });

    expect(result.outcome).toBe('delivered');
    expect((await notifications.findById(id))?.attempts).toBe(2);
  });

  it('lança NotificationNotFoundError para id inexistente', async () => {
    const { useCase } = build(provider);
    await expect(useCase.execute({ notificationId: 'missing' })).rejects.toBeInstanceOf(
      NotificationNotFoundError,
    );
  });
});
