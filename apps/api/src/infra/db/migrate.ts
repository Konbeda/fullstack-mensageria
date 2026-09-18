import { loadEnv } from '../../config/env.js';
import { createDb } from './client.js';
import { migrateToLatest } from './migrator.js';

async function main(): Promise<void> {
  const env = loadEnv();
  const db = createDb(env.DATABASE_URL);
  try {
    await migrateToLatest(db);
    console.log('migrations aplicadas com sucesso');
  } finally {
    await db.destroy();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
