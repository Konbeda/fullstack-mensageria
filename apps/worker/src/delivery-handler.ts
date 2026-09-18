import type { NotificationQueuedEvent, ProcessDelivery } from '@mensageria/core';
import { CircuitOpenError, type CircuitBreakerRegistry } from './resilience/circuit-breaker.js';

export type DeliveryOutcome = 'delivered' | 'retry' | 'dead_letter';

export interface DeliveryLogger {
  warn(obj: Record<string, unknown>, msg: string): void;
}

export interface DeliveryHandlerDeps {
  process: ProcessDelivery;
  breakers: CircuitBreakerRegistry;
  maxAttempts: number;
  logger?: DeliveryLogger;
}

export class DeliveryHandler {
  constructor(private readonly deps: DeliveryHandlerDeps) {}

  // `attempt` é o número de tentativas já feitas antes desta (0 na primeira entrega).
  async handle(event: NotificationQueuedEvent, attempt: number): Promise<DeliveryOutcome> {
    const breaker = this.deps.breakers.for(event.channel);
    try {
      await breaker.execute(() =>
        this.deps.process.execute({ notificationId: event.notificationId }),
      );
      return 'delivered';
    } catch (error) {
      const attemptsMade = attempt + 1;
      const outcome: DeliveryOutcome =
        attemptsMade >= this.deps.maxAttempts ? 'dead_letter' : 'retry';
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
