import type {
  DeadLetterNotification,
  NotificationQueuedEvent,
  ProcessDelivery,
} from '@mensageria/core';
import type { Metrics } from '@mensageria/observability';
import { CircuitOpenError, type CircuitBreakerRegistry } from './resilience/circuit-breaker.js';

export type DeliveryOutcome = 'delivered' | 'retry' | 'dead_letter';

export interface DeliveryLogger {
  warn(obj: Record<string, unknown>, msg: string): void;
}

export interface DeliveryHandlerDeps {
  process: ProcessDelivery;
  deadLetter: DeadLetterNotification;
  breakers: CircuitBreakerRegistry;
  maxAttempts: number;
  logger?: DeliveryLogger;
  metrics?: Metrics;
}

export class DeliveryHandler {
  constructor(private readonly deps: DeliveryHandlerDeps) {}

  // `attempt` é o número de tentativas já feitas antes desta (0 na primeira entrega).
  async handle(event: NotificationQueuedEvent, attempt: number): Promise<DeliveryOutcome> {
    const breaker = this.deps.breakers.for(event.channel);
    const stopTimer = this.deps.metrics?.deliveryDuration.startTimer({ channel: event.channel });
    try {
      await breaker.execute(() =>
        this.deps.process.execute({ notificationId: event.notificationId }),
      );
      this.deps.metrics?.delivered.inc({ channel: event.channel });
      stopTimer?.({ outcome: 'delivered' });
      return 'delivered';
    } catch (error) {
      this.deps.metrics?.failed.inc({ channel: event.channel });
      const attemptsMade = attempt + 1;
      const outcome: DeliveryOutcome =
        attemptsMade >= this.deps.maxAttempts ? 'dead_letter' : 'retry';
      if (outcome === 'dead_letter') {
        await this.deps.deadLetter.execute(event.notificationId);
        this.deps.metrics?.deadLettered.inc({ channel: event.channel });
      }
      stopTimer?.({ outcome });
      this.deps.logger?.warn(
        {
          notificationId: event.notificationId,
          channel: event.channel,
          attemptsMade,
          outcome,
          circuitOpen: error instanceof CircuitOpenError,
          error: error instanceof Error ? error.message : String(error),
        },
        'falha na entrega',
      );
      return outcome;
    }
  }
}
