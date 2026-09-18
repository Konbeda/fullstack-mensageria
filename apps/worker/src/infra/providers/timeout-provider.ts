import {
  type DeliveryResult,
  type Notification,
  type NotificationProvider,
  ProviderError,
} from '@mensageria/core';

// Timeout em I/O externa: se o provedor não responder a tempo, falha (retryable).
export class TimeoutProvider implements NotificationProvider {
  constructor(
    private readonly inner: NotificationProvider,
    private readonly timeoutMs: number,
  ) {}

  async send(notification: Notification): Promise<DeliveryResult> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(
        () => reject(new ProviderError(`timeout do provedor após ${this.timeoutMs}ms`, true)),
        this.timeoutMs,
      );
    });
    try {
      return await Promise.race([this.inner.send(notification), timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
