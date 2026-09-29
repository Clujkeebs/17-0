import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };
const url = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/gridiron';
const client = globalForDb.pg ?? postgres(url, { max: Number(process.env.DB_POOL_MAX ?? 10), prepare: false });
if (process.env.NODE_ENV !== 'production') globalForDb.pg = client;

export const db = drizzle(client, { schema });
export const sql = client;
export { schema };
