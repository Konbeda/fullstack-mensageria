import type { EnqueueNotification, GetNotification } from '@mensageria/core';

export interface AppDependencies {
  enqueue: EnqueueNotification;
  getNotification: GetNotification;
}
