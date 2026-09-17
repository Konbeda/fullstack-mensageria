import type { CreateNotification } from '@mensageria/contracts';
import { Notification, type NotificationSnapshot } from '../../domain/notification.js';
import type { Clock } from '../ports/clock.js';
import type { EventPublisher } from '../ports/event-publisher.js';
import type { IdGenerator } from '../ports/id-generator.js';
import type { IdempotencyStore } from '../ports/idempotency-store.js';
import type { NotificationRepository } from '../ports/notification-repository.js';

export interface EnqueueNotificationInput {
  data: CreateNotification;
  idempotencyKey?: string;
}

export interface EnqueueNotificationResult {
  notification: NotificationSnapshot;
  deduplicated: boolean;
}

export interface EnqueueNotificationDeps {
  notifications: NotificationRepository;
  publisher: EventPublisher;
  idempotency: IdempotencyStore;
  clock: Clock;
  ids: IdGenerator;
}

export class EnqueueNotification {
  constructor(private readonly deps: EnqueueNotificationDeps) {}

  async execute(input: EnqueueNotificationInput): Promise<EnqueueNotificationResult> {
    const { notifications, publisher, idempotency, clock, ids } = this.deps;

    if (input.idempotencyKey) {
      const existingId = await idempotency.findNotificationId(input.idempotencyKey);
      if (existingId) {
        const existing = await notifications.findById(existingId);
        if (existing) return { notification: existing.toSnapshot(), deduplicated: true };
      }
    }

    const notification = Notification.create({
      id: ids.next(),
      data: input.data,
      now: clock.now(),
    });

    await notifications.save(notification);
    if (input.idempotencyKey) {
      await idempotency.remember(input.idempotencyKey, notification.id);
    }
    await publisher.publishNotificationQueued({
      notificationId: notification.id,
      channel: notification.channel,
    });

    return { notification: notification.toSnapshot(), deduplicated: false };
  }
}
