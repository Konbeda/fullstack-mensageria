import { NOTIFICATIONS_EXCHANGE, NOTIFICATION_QUEUED_ROUTING_KEY } from '@mensageria/infra';
import type { Channel } from 'amqplib';

export const DELIVERY_QUEUE = 'notifications.delivery';
export const RETRY_EXCHANGE = 'notifications.retry';
export const RETRY_QUEUE = 'notifications.retry.wait';
export const RETRY_ROUTING_KEY = 'retry';
export const DLX_EXCHANGE = 'notifications.dlx';
export const DLQ = 'notifications.dlq';

export async function assertWorkerTopology(channel: Channel): Promise<void> {
  await channel.assertExchange(NOTIFICATIONS_EXCHANGE, 'topic', { durable: true });

  // Dead-letter: mensagens esgotadas caem aqui e ficam visíveis para inspeção/reprocesso.
  await channel.assertExchange(DLX_EXCHANGE, 'fanout', { durable: true });
  await channel.assertQueue(DLQ, { durable: true });
  await channel.bindQueue(DLQ, DLX_EXCHANGE, '');

  // Retry com backoff: a fila de espera não tem consumidor; ao expirar o TTL da mensagem,
  // ela é dead-lettered de volta para a exchange principal e reentra na fila de entrega.
  await channel.assertExchange(RETRY_EXCHANGE, 'direct', { durable: true });
  await channel.assertQueue(RETRY_QUEUE, {
    durable: true,
    deadLetterExchange: NOTIFICATIONS_EXCHANGE,
    deadLetterRoutingKey: NOTIFICATION_QUEUED_ROUTING_KEY,
  });
  await channel.bindQueue(RETRY_QUEUE, RETRY_EXCHANGE, RETRY_ROUTING_KEY);

  await channel.assertQueue(DELIVERY_QUEUE, { durable: true });
  await channel.bindQueue(DELIVERY_QUEUE, NOTIFICATIONS_EXCHANGE, NOTIFICATION_QUEUED_ROUTING_KEY);
}
