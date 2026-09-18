import type { EnqueueNotification, GetNotification, ListNotifications } from '@mensageria/core';

export interface AppDependencies {
  enqueue: EnqueueNotification;
  getNotification: GetNotification;
  listNotifications: ListNotifications;
}
