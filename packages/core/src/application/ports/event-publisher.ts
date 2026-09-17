import type { Channel } from '@mensageria/contracts';

export interface NotificationQueuedEvent {
  notificationId: string;
  channel: Channel;
}

export interface EventPublisher {
  publishNotificationQueued(event: NotificationQueuedEvent): Promise<void>;
}
