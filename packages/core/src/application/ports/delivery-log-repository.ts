export interface DeliveryAttemptLog {
  notificationId: string;
  attempt: number;
  outcome: 'delivered' | 'failed';
  providerMessageId?: string;
  error?: string;
  at: Date;
}

export interface DeliveryLogRepository {
  append(log: DeliveryAttemptLog): Promise<void>;
}
