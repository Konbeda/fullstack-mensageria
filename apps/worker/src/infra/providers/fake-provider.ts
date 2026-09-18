import { setTimeout as sleep } from 'node:timers/promises';
import { randomUUID } from 'node:crypto';
import type { DeliveryResult, Notification, NotificationProvider } from '@mensageria/core';
import { ProviderError } from '@mensageria/core';

export interface FakeProviderOptions {
  failureRate?: number;
  latencyMs?: number;
  random?: () => number;
}

// Simula um provedor externo (email/SMS/push): latência e falhas transitórias.
export class FakeNotificationProvider implements NotificationProvider {
  private readonly failureRate: number;
  private readonly latencyMs: number;
  private readonly random: () => number;

  constructor(options: FakeProviderOptions = {}) {
    this.failureRate = options.failureRate ?? 0;
    this.latencyMs = options.latencyMs ?? 0;
    this.random = options.random ?? Math.random;
  }

  async send(notification: Notification): Promise<DeliveryResult> {
    if (this.latencyMs > 0) await sleep(this.latencyMs);
    // Gatilho determinístico para demonstrar o fluxo de falha/DLQ: destinatários "fail...".
    const poison = notification.to.toLowerCase().startsWith('fail');
    if (poison || this.random() < this.failureRate) {
      throw new ProviderError('provedor externo indisponível', true);
    }
    return { providerMessageId: randomUUID() };
  }
}
