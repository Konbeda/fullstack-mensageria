import type { EventPublisher, NotificationQueuedEvent } from '@mensageria/core';
import type { ConfirmChannel } from 'amqplib';
import { NOTIFICATIONS_EXCHANGE, NOTIFICATION_QUEUED_ROUTING_KEY } from './topology.js';

export class RabbitEventPublisher implements EventPublisher {
  constructor(private readonly channel: ConfirmChannel) {}

  async publishNotificationQueued(event: NotificationQueuedEvent): Promise<void> {
    const payload = Buffer.from(JSON.stringify(event));
    // Publisher confirms: só resolve quando o broker confirma a persistência.
    await new Promise<void>((resolve, reject) => {
      this.channel.publish(
        NOTIFICATIONS_EXCHANGE,
        NOTIFICATION_QUEUED_ROUTING_KEY,
        payload,
        { persistent: true, contentType: 'application/json' },
        (err) => {
          if (err) reject(err instanceof Error ? err : new Error(String(err)));
          else resolve();
        },
      );
    });
  }
}
