import type { Channel } from '@mensageria/contracts';
import type { Notification } from '../../domain/notification.js';

export interface DeliveryResult {
  providerMessageId: string;
}

export interface NotificationProvider {
  send(notification: Notification): Promise<DeliveryResult>;
}

export interface ProviderRegistry {
  get(channel: Channel): NotificationProvider;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}
