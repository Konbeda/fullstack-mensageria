import { Migrator } from 'kysely';
import type { Db } from './client.js';
import { migrations } from './migrations/index.js';

export async function migrateToLatest(db: Db): Promise<void> {
  const migrator = new Migrator({
    db,
    provider: { getMigrations: () => Promise.resolve(migrations) },
  });

  const { error, results } = await migrator.migrateToLatest();
  for (const result of results ?? []) {
    if (result.status === 'Error') {
      throw new Error(`falha na migration ${result.migrationName}`);
    }
  }
  if (error) {
    throw error instanceof Error
      ? error
      : new Error('falha ao aplicar migrations', { cause: error });
  }
}
