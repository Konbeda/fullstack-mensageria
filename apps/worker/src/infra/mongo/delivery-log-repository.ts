import type { DeliveryAttemptLog, DeliveryLogRepository } from '@mensageria/core';
import type { Db } from 'mongodb';

export class MongoDeliveryLogRepository implements DeliveryLogRepository {
  constructor(private readonly db: Db) {}

  async append(log: DeliveryAttemptLog): Promise<void> {
    await this.db.collection<DeliveryAttemptLog>('delivery_logs').insertOne({ ...log });
  }
}
