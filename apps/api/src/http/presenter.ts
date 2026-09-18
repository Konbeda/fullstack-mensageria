import type { Notification } from '@mensageria/contracts';
import type { NotificationSnapshot } from '@mensageria/core';

export function presentNotification(snapshot: NotificationSnapshot): Notification {
  return {
    id: snapshot.id,
    status: snapshot.status,
    channel: snapshot.channel,
    to: snapshot.to,
    attempts: snapshot.attempts,
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
  };
}
