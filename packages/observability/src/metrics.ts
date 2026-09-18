import { collectDefaultMetrics, Counter, Histogram, Registry } from 'prom-client';

export interface Metrics {
  registry: Registry;
  enqueued: Counter<'channel'>;
  delivered: Counter<'channel'>;
  failed: Counter<'channel'>;
  deadLettered: Counter<'channel'>;
  deliveryDuration: Histogram<'channel' | 'outcome'>;
}

export function createMetrics(): Metrics {
  const registry = new Registry();
  collectDefaultMetrics({ register: registry });

  return {
    registry,
    enqueued: new Counter({
      name: 'notifications_enqueued_total',
      help: 'Total de notificações aceitas e enfileiradas',
      labelNames: ['channel'],
      registers: [registry],
    }),
    delivered: new Counter({
      name: 'notifications_delivered_total',
      help: 'Total de notificações entregues com sucesso',
      labelNames: ['channel'],
      registers: [registry],
    }),
    failed: new Counter({
      name: 'notifications_failed_total',
      help: 'Total de tentativas de entrega que falharam',
      labelNames: ['channel'],
      registers: [registry],
    }),
    deadLettered: new Counter({
      name: 'notifications_dead_lettered_total',
      help: 'Total de notificações enviadas para a dead-letter queue',
      labelNames: ['channel'],
      registers: [registry],
    }),
    deliveryDuration: new Histogram({
      name: 'notification_delivery_duration_seconds',
      help: 'Duração do processamento de uma tentativa de entrega',
      labelNames: ['channel', 'outcome'],
      buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
      registers: [registry],
    }),
  };
}
