let pool: any = null;

export async function query(text: string, params?: any[]) {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not configured");

  if (!pool) {
    const { Pool } = await import('pg');
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}
