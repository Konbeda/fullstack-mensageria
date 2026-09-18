import type { Migration } from 'kysely';
import * as createNotifications from './001-create-notifications.js';

// Provider estático evita import dinâmico do filesystem (funciona em tsx, testes e bundle).
export const migrations: Record<string, Migration> = {
  '001-create-notifications': createNotifications,
};
