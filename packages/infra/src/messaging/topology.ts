import type { Channel } from 'amqplib';

export const NOTIFICATIONS_EXCHANGE = 'notifications.events';
export const NOTIFICATION_QUEUED_ROUTING_KEY = 'notification.queued';

export async function assertTopology(channel: Channel): Promise<void> {
  await channel.assertExchange(NOTIFICATIONS_EXCHANGE, 'topic', { durable: true });
}
