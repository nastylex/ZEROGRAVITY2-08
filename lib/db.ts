export {};

declare global {
  // Reuse a single PG Pool across module reloads (dev HMR) and server instances
  // to avoid leaking connections. This stores the pool on globalThis.
  // eslint-disable-next-line no-var
  var __pgPool: import('pg').Pool | undefined;
}

async function createPool() {
  const { Pool } = await import('pg');
  return new Pool({ connectionString: process.env.DATABASE_URL });
}

async function getPool(): Promise<import('pg').Pool> {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not configured');

  if (!globalThis.__pgPool) {
    globalThis.__pgPool = await createPool();
  }
  return globalThis.__pgPool!;
}

export async function query(text: string, params?: any[]) {
  const pool = await getPool();
  // For simple queries, use pool.query which handles acquiring/releasing clients.
  return pool.query(text, params);
}
