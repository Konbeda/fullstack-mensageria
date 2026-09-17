import { NotificationNotFoundError } from '../../domain/errors.js';
import type { Clock } from '../ports/clock.js';
import type { DeliveryLogRepository } from '../ports/delivery-log-repository.js';
import type { NotificationRepository } from '../ports/notification-repository.js';
import type { ProviderRegistry } from '../ports/notification-provider.js';

export interface ProcessDeliveryInput {
  notificationId: string;
}

export interface ProcessDeliveryResult {
  outcome: 'delivered';
  deduplicated: boolean;
}

export interface ProcessDeliveryDeps {
  notifications: NotificationRepository;
  providers: ProviderRegistry;
  deliveryLog: DeliveryLogRepository;
  clock: Clock;
}

export class ProcessDelivery {
  constructor(private readonly deps: ProcessDeliveryDeps) {}

  async execute(input: ProcessDeliveryInput): Promise<ProcessDeliveryResult> {
    const { notifications, providers, deliveryLog, clock } = this.deps;

    const notification = await notifications.findById(input.notificationId);
    if (!notification) throw new NotificationNotFoundError(input.notificationId);

    // Entrega já concluída: consumo duplicado da fila é ignorado (idempotência).
    if (notification.status === 'delivered') {
      return { outcome: 'delivered', deduplicated: true };
    }

    notification.markProcessing(clock.now());
    notification.recordAttempt();
    await notifications.save(notification);

    const provider = providers.get(notification.channel);
    try {
      const result = await provider.send(notification);
      notification.markDelivered(clock.now());
      await notifications.save(notification);
      await deliveryLog.append({
        notificationId: notification.id,
        attempt: notification.attempts,
        outcome: 'delivered',
        providerMessageId: result.providerMessageId,
        at: clock.now(),
      });
      return { outcome: 'delivered', deduplicated: false };
    } catch (error) {
      notification.markFailed(clock.now());
      await notifications.save(notification);
      await deliveryLog.append({
        notificationId: notification.id,
        attempt: notification.attempts,
        outcome: 'failed',
        error: error instanceof Error ? error.message : String(error),
        at: clock.now(),
      });
      throw error;
    }
  }
}
