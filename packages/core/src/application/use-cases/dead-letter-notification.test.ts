import { describe, expect, it } from 'vitest';
import { Notification } from '../../domain/notification.js';
import { DeadLetterNotification } from './dead-letter-notification.js';
import { FixedClock, InMemoryNotificationRepository } from '../../testing/fakes.js';

const now = new Date('2026-09-18T00:00:00.000Z');

async function seedFailed(repo: InMemoryNotificationRepository, id: string): Promise<void> {
  const n = Notification.create({
    id,
    data: { channel: 'email', to: 'ana@example.com', subject: 'oi', body: 'corpo' },
    now,
  });
  n.markProcessing(now);
  n.markFailed(now);
  await repo.save(n);
}

describe('DeadLetterNotification', () => {
  it('marca a notificação como dead_lettered', async () => {
    const repo = new InMemoryNotificationRepository();
    await seedFailed(repo, 'n-1');

    await new DeadLetterNotification({ notifications: repo, clock: new FixedClock(now) }).execute(
      'n-1',
    );

    expect((await repo.findById('n-1'))?.status).toBe('dead_lettered');
  });

  it('é idempotente e ignora id inexistente', async () => {
    const repo = new InMemoryNotificationRepository();
    const useCase = new DeadLetterNotification({ notifications: repo, clock: new FixedClock(now) });

    await expect(useCase.execute('missing')).resolves.toBeUndefined();

    await seedFailed(repo, 'n-1');
    await useCase.execute('n-1');
    await useCase.execute('n-1');
    expect((await repo.findById('n-1'))?.status).toBe('dead_lettered');
  });
});
