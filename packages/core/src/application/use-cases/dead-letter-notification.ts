import type { Clock } from '../ports/clock.js';
import type { NotificationRepository } from '../ports/notification-repository.js';

export interface DeadLetterNotificationDeps {
  notifications: NotificationRepository;
  clock: Clock;
}

export class DeadLetterNotification {
  constructor(private readonly deps: DeadLetterNotificationDeps) {}

  async execute(notificationId: string): Promise<void> {
    const notification = await this.deps.notifications.findById(notificationId);
    if (!notification || notification.status === 'dead_lettered') return;
    notification.deadLetter(this.deps.clock.now());
    await this.deps.notifications.save(notification);
  }
}
