import { describe, expect, it } from 'vitest';
import type { CreateNotification } from '@mensageria/contracts';
import { Notification } from '../../domain/notification.js';
import { ListNotifications } from './list-notifications.js';
import { InMemoryNotificationRepository } from '../../testing/fakes.js';

async function seed(repo: InMemoryNotificationRepository, id: string, data: CreateNotification) {
  await repo.save(Notification.create({ id, data, now: new Date() }));
}

describe('ListNotifications', () => {
  it('pagina os resultados e retorna o total', async () => {
    const repo = new InMemoryNotificationRepository();
    for (let i = 0; i < 5; i += 1) {
      await seed(repo, `n-${i}`, { channel: 'sms', to: '+5511999998888', body: 'oi' });
    }

    const result = await new ListNotifications({ notifications: repo }).execute({
      page: 1,
      pageSize: 2,
    });

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(5);
    expect(result.pageSize).toBe(2);
  });

  it('filtra por canal', async () => {
    const repo = new InMemoryNotificationRepository();
    await seed(repo, 'a', { channel: 'sms', to: '+5511999998888', body: 'oi' });
    await seed(repo, 'b', { channel: 'email', to: 'ana@example.com', subject: 's', body: 'b' });

    const result = await new ListNotifications({ notifications: repo }).execute({
      filter: { channel: 'email' },
    });

    expect(result.total).toBe(1);
    expect(result.items[0]?.channel).toBe('email');
  });

  it('limita o pageSize ao máximo permitido', async () => {
    const repo = new InMemoryNotificationRepository();
    const result = await new ListNotifications({ notifications: repo }).execute({ pageSize: 1000 });
    expect(result.pageSize).toBe(100);
  });
});
