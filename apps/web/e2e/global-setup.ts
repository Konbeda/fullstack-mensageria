import { createDb, migrateToLatest } from '@mensageria/infra';

const DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? 'postgres://mensageria:mensageria@localhost:5432/mensageria';

export default async function globalSetup(): Promise<void> {
  const db = createDb(DATABASE_URL);
  try {
    await migrateToLatest(db);
  } finally {
    await db.destroy();
  }
}
