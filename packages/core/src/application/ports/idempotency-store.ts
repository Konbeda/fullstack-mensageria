export interface IdempotencyStore {
  findNotificationId(key: string): Promise<string | null>;
  remember(key: string, notificationId: string): Promise<void>;
}
