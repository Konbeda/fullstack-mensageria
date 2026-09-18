import type { Channel, NotificationStatus } from '@mensageria/contracts';
import {
  Notification,
  type NotificationRepository,
  type NotificationSnapshot,
} from '@mensageria/core';
import type { Selectable } from 'kysely';
import type { Db } from './client.js';
import type { Database } from './schema.js';

type Row = Selectable<Database['notifications']>;

function toSnapshot(row: Row): NotificationSnapshot {
  return {
    id: row.id,
    channel: row.channel as Channel,
    to: row.recipient,
    content: row.content,
    status: row.status as NotificationStatus,
    attempts: row.attempts,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class PostgresNotificationRepository implements NotificationRepository {
  constructor(private readonly db: Db) {}

  async save(notification: Notification): Promise<void> {
    const s = notification.toSnapshot();
    await this.db
      .insertInto('notifications')
      .values({
        id: s.id,
        channel: s.channel,
        recipient: s.to,
        content: JSON.stringify(s.content),
        status: s.status,
        attempts: s.attempts,
        created_at: s.createdAt,
        updated_at: s.updatedAt,
      })
      .onConflict((oc) =>
        oc.column('id').doUpdateSet({
          status: s.status,
          attempts: s.attempts,
          content: JSON.stringify(s.content),
          updated_at: s.updatedAt,
        }),
      )
      .execute();
  }

  async findById(id: string): Promise<Notification | null> {
    const row = await this.db
      .selectFrom('notifications')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return row ? Notification.restore(toSnapshot(row)) : null;
  }
}
