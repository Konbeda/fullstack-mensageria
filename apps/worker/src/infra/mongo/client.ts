import { type Db, MongoClient } from 'mongodb';

export interface MongoConnection {
  db: Db;
  close(): Promise<void>;
}

export async function createMongo(url: string, dbName: string): Promise<MongoConnection> {
  const client = new MongoClient(url);
  await client.connect();
  return {
    db: client.db(dbName),
    close: () => client.close(),
  };
}
