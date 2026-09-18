import type { ColumnType } from 'kysely';
import type { NotificationContent } from '@mensageria/core';

interface NotificationsTable {
  id: string;
  channel: string;
  recipient: string;
  content: ColumnType<NotificationContent, string, string>;
  status: string;
  attempts: number;
  created_at: ColumnType<Date, Date, Date>;
  updated_at: ColumnType<Date, Date, Date>;
}

export interface Database {
  notifications: NotificationsTable;
}
