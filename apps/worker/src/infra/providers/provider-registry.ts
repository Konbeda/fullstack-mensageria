import type { Channel } from '@mensageria/contracts';
import type { NotificationProvider, ProviderRegistry } from '@mensageria/core';

export class ChannelProviderRegistry implements ProviderRegistry {
  constructor(private readonly providers: Record<Channel, NotificationProvider>) {}

  get(channel: Channel): NotificationProvider {
    return this.providers[channel];
  }
}
