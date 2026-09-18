import type { Channel, NotificationStatus } from '@mensageria/contracts';
import {
  Notification,
  type NotificationListParams,
  type NotificationListResult,
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

  async list(params: NotificationListParams): Promise<NotificationListResult> {
    let query = this.db.selectFrom('notifications');
    if (params.filter?.status) query = query.where('status', '=', params.filter.status);
    if (params.filter?.channel) query = query.where('channel', '=', params.filter.channel);

    const rows = await query
      .selectAll()
      .orderBy('created_at', 'desc')
      .limit(params.limit)
      .offset(params.offset)
      .execute();

    const counted = await query
      .select((eb) => eb.fn.countAll<string>().as('total'))
      .executeTakeFirstOrThrow();

    return { items: rows.map(toSnapshot), total: Number(counted.total) };
  }
}
