import type { Notification } from '../../domain/notification.js';

export interface NotificationRepository {
  save(notification: Notification): Promise<void>;
  findById(id: string): Promise<Notification | null>;
}
