import type { NotificationSnapshot } from '../../domain/notification.js';
import type { NotificationRepository } from '../ports/notification-repository.js';

export interface GetNotificationDeps {
  notifications: NotificationRepository;
}

export class GetNotification {
  constructor(private readonly deps: GetNotificationDeps) {}

  async execute(id: string): Promise<NotificationSnapshot | null> {
    const notification = await this.deps.notifications.findById(id);
    return notification ? notification.toSnapshot() : null;
  }
}
