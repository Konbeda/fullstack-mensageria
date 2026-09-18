import type { Channel, NotificationStatus } from '@mensageria/contracts';
import type { Notification, NotificationSnapshot } from '../../domain/notification.js';

export interface NotificationListFilter {
  status?: NotificationStatus;
  channel?: Channel;
}

export interface NotificationListParams {
  limit: number;
  offset: number;
  filter?: NotificationListFilter;
}

export interface NotificationListResult {
  items: NotificationSnapshot[];
  total: number;
}

export interface NotificationRepository {
  save(notification: Notification): Promise<void>;
  findById(id: string): Promise<Notification | null>;
  list(params: NotificationListParams): Promise<NotificationListResult>;
}
