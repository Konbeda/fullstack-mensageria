import { beforeEach, describe, expect, it } from 'vitest';
import {
  DeadLetterNotification,
  Notification,
  ProcessDelivery,
  ProviderError,
} from '@mensageria/core';
import {
  FakeProvider,
  FixedClock,
  InMemoryDeliveryLogRepository,
  InMemoryNotificationRepository,
  StubProviderRegistry,
} from '@mensageria/core/testing';
import { DeliveryHandler } from './delivery-handler.js';
import { CircuitBreaker, CircuitBreakerRegistry } from './resilience/circuit-breaker.js';

const now = new Date('2026-09-17T00:00:00.000Z');

function buildHandler(provider: FakeProvider, maxAttempts: number, failureThreshold = 100) {
  const notifications = new InMemoryNotificationRepository();
  const clock = new FixedClock(now);
  const process = new ProcessDelivery({
    notifications,
    providers: new StubProviderRegistry(provider),
    deliveryLog: new InMemoryDeliveryLogRepository(),
    clock,
  });
  const deadLetter = new DeadLetterNotification({ notifications, clock });
  const breakers = new CircuitBreakerRegistry(
    () => new CircuitBreaker({ failureThreshold, resetMs: 10_000, now: () => 0 }),
  );
  const handler = new DeliveryHandler({ process, deadLetter, breakers, maxAttempts });
  return { notifications, handler };
}

async function seed(notifications: InMemoryNotificationRepository, id: string): Promise<void> {
  await notifications.save(
    Notification.create({
      id,
      data: { channel: 'email', to: 'ana@example.com', subject: 'oi', body: 'corpo' },
      now,
    }),
  );
}

describe('DeliveryHandler', () => {
  let okProvider: FakeProvider;
  let failProvider: FakeProvider;

  beforeEach(() => {
    okProvider = new FakeProvider(() => ({ providerMessageId: 'ok' }));
    failProvider = new FakeProvider(() => {
      throw new ProviderError('down', true);
    });
  });

  it('retorna delivered quando o provider entrega', async () => {
    const { notifications, handler } = buildHandler(okProvider, 3);
    await seed(notifications, 'n-1');

    const outcome = await handler.handle({ notificationId: 'n-1', channel: 'email' }, 0);

    expect(outcome).toBe('delivered');
    expect((await notifications.findById('n-1'))?.status).toBe('delivered');
  });

  it('retorna retry quando falha e ainda há tentativas', async () => {
    const { notifications, handler } = buildHandler(failProvider, 3);
    await seed(notifications, 'n-1');

    expect(await handler.handle({ notificationId: 'n-1', channel: 'email' }, 0)).toBe('retry');
  });

  it('retorna dead_letter e marca a notificação quando esgota as tentativas', async () => {
    const { notifications, handler } = buildHandler(failProvider, 3);
    await seed(notifications, 'n-1');

    expect(await handler.handle({ notificationId: 'n-1', channel: 'email' }, 2)).toBe(
      'dead_letter',
    );
    expect((await notifications.findById('n-1'))?.status).toBe('dead_lettered');
  });

  it('com o circuit aberto, não chama o provider e ainda assim decide retry', async () => {
    const { notifications, handler } = buildHandler(failProvider, 3, 1);
    await seed(notifications, 'n-1');

    await handler.handle({ notificationId: 'n-1', channel: 'email' }, 0); // abre o breaker
    const callsAfterOpen = failProvider.sent.length;
    const outcome = await handler.handle({ notificationId: 'n-1', channel: 'email' }, 1);

    expect(outcome).toBe('retry');
    expect(failProvider.sent.length).toBe(callsAfterOpen); // provider não foi chamado
  });
});
