import type { Channel, ConsumeMessage } from 'amqplib';
import type { DeliveryHandler } from '../delivery-handler.js';
import { NotificationQueuedEventSchema } from './event-schema.js';
import { DELIVERY_QUEUE, DLX_EXCHANGE, RETRY_EXCHANGE, RETRY_ROUTING_KEY } from './topology.js';

export interface ConsumerLogger {
  error(obj: Record<string, unknown>, msg: string): void;
}

export interface StartConsumerOptions {
  channel: Channel;
  handler: DeliveryHandler;
  prefetch: number;
  backoff: (attempt: number) => number;
  logger?: ConsumerLogger;
}

export interface RunningConsumer {
  stop(): Promise<void>;
}

function safeJson(buffer: Buffer): unknown {
  try {
    return JSON.parse(buffer.toString());
  } catch {
    return null;
  }
}

export async function startConsumer(options: StartConsumerOptions): Promise<RunningConsumer> {
  const { channel, handler, prefetch, backoff, logger } = options;
  await channel.prefetch(prefetch);

  const process = async (message: ConsumeMessage): Promise<void> => {
    const headers = (message.properties.headers ?? {}) as Record<string, unknown>;
    const attempt = Number(headers['x-attempt'] ?? 0);

    const parsed = NotificationQueuedEventSchema.safeParse(safeJson(message.content));
    if (!parsed.success) {
      channel.publish(DLX_EXCHANGE, '', message.content, { persistent: true });
      channel.ack(message);
      return;
    }

    const outcome = await handler.handle(parsed.data, attempt);
    if (outcome === 'delivered') {
      channel.ack(message);
      return;
    }
    if (outcome === 'retry') {
      const nextAttempt = attempt + 1;
      channel.publish(RETRY_EXCHANGE, RETRY_ROUTING_KEY, message.content, {
        persistent: true,
        expiration: String(backoff(nextAttempt)),
        headers: { 'x-attempt': nextAttempt },
      });
      channel.ack(message);
      return;
    }
    channel.publish(DLX_EXCHANGE, '', message.content, {
      persistent: true,
      headers: { 'x-attempt': attempt },
    });
    channel.ack(message);
  };

  const { consumerTag } = await channel.consume(DELIVERY_QUEUE, (message) => {
    if (!message) return;
    process(message).catch((error: unknown) => {
      logger?.error(
        { error: error instanceof Error ? error.message : String(error) },
        'erro ao processar mensagem',
      );
    });
  });

  return {
    stop: async () => {
      await channel.cancel(consumerTag);
    },
  };
}
