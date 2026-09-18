import type { NotificationSnapshot } from '../../domain/notification.js';
import type {
  NotificationListFilter,
  NotificationRepository,
} from '../ports/notification-repository.js';

const MAX_PAGE_SIZE = 100;

export interface ListNotificationsInput {
  page?: number;
  pageSize?: number;
  filter?: NotificationListFilter;
}

export interface ListNotificationsResult {
  items: NotificationSnapshot[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListNotificationsDeps {
  notifications: NotificationRepository;
}

export class ListNotifications {
  constructor(private readonly deps: ListNotificationsDeps) {}

  async execute(input: ListNotificationsInput = {}): Promise<ListNotificationsResult> {
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, input.pageSize ?? 20));
    const { items, total } = await this.deps.notifications.list({
      limit: pageSize,
      offset: (page - 1) * pageSize,
      ...(input.filter ? { filter: input.filter } : {}),
    });
    return { items, total, page, pageSize };
  }
}
