import type { Channel } from '@mensageria/contracts';
import { Notification, type NotificationSnapshot } from '../domain/notification.js';
import type { Clock } from '../application/ports/clock.js';
import type { IdGenerator } from '../application/ports/id-generator.js';
import type { NotificationRepository } from '../application/ports/notification-repository.js';
import type {
  DeliveryAttemptLog,
  DeliveryLogRepository,
} from '../application/ports/delivery-log-repository.js';
import type {
  EventPublisher,
  NotificationQueuedEvent,
} from '../application/ports/event-publisher.js';
import type { IdempotencyStore } from '../application/ports/idempotency-store.js';
import type {
  DeliveryResult,
  NotificationProvider,
  ProviderRegistry,
} from '../application/ports/notification-provider.js';

export class InMemoryNotificationRepository implements NotificationRepository {
  private readonly store = new Map<string, NotificationSnapshot>();

  async save(notification: Notification): Promise<void> {
    this.store.set(notification.id, notification.toSnapshot());
  }

  async findById(id: string): Promise<Notification | null> {
    const snapshot = this.store.get(id);
    return snapshot ? Notification.restore(snapshot) : null;
  }
}

export class InMemoryDeliveryLogRepository implements DeliveryLogRepository {
  readonly logs: DeliveryAttemptLog[] = [];

  async append(log: DeliveryAttemptLog): Promise<void> {
    this.logs.push(log);
  }
}

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly keys = new Map<string, string>();

  async findNotificationId(key: string): Promise<string | null> {
    return this.keys.get(key) ?? null;
  }

  async remember(key: string, notificationId: string): Promise<void> {
    this.keys.set(key, notificationId);
  }
}

export class RecordingEventPublisher implements EventPublisher {
  readonly events: NotificationQueuedEvent[] = [];

  async publishNotificationQueued(event: NotificationQueuedEvent): Promise<void> {
    this.events.push(event);
  }
}

export class FixedClock implements Clock {
  constructor(private current: Date) {}

  now(): Date {
    return this.current;
  }

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}

export class SequentialIdGenerator implements IdGenerator {
  private counter = 0;

  constructor(private readonly prefix = 'id') {}

  next(): string {
    this.counter += 1;
    return `${this.prefix}-${this.counter}`;
  }
}

export class FakeProvider implements NotificationProvider {
  sent: Notification[] = [];

  constructor(
    private readonly behavior: () => DeliveryResult = () => ({ providerMessageId: 'ok' }),
  ) {}

  async send(notification: Notification): Promise<DeliveryResult> {
    this.sent.push(notification);
    return this.behavior();
  }
}

export class StubProviderRegistry implements ProviderRegistry {
  constructor(private readonly provider: NotificationProvider) {}

  get(_channel: Channel): NotificationProvider {
    return this.provider;
  }
}
