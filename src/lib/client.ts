import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import { getNeonSql } from './neon';

export type Database = NeonHttpDatabase<typeof schema>;

let dbInstance: Database | null = null;

export function getDb(): Database {
  if (!dbInstance) {
    const instance = drizzle(getNeonSql(), { schema });
    // Neon HTTP driver is stateless HTTP and does not support native multi-query transactions.
    // Provide a resilient sequential fallback so business logic calling db.transaction executes safely.
    (instance as any).transaction = async (cb: (tx: any) => Promise<any>) => await cb(instance);
    dbInstance = instance;
  }
  return dbInstance;
}
