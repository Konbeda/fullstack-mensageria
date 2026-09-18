import { describe, expect, it } from 'vitest';
import { Notification } from '../../domain/notification.js';
import { GetNotification } from './get-notification.js';
import { InMemoryNotificationRepository } from '../../testing/fakes.js';

const now = new Date('2026-09-17T00:00:00.000Z');

describe('GetNotification', () => {
  it('retorna o snapshot quando existe', async () => {
    const notifications = new InMemoryNotificationRepository();
    const n = Notification.create({
      id: 'n-1',
      data: { channel: 'sms', to: '+5511999998888', body: 'oi' },
      now,
    });
    await notifications.save(n);

    const result = await new GetNotification({ notifications }).execute('n-1');
    expect(result?.id).toBe('n-1');
  });

  it('retorna null quando não existe', async () => {
    const notifications = new InMemoryNotificationRepository();
    expect(await new GetNotification({ notifications }).execute('missing')).toBeNull();
  });
});
