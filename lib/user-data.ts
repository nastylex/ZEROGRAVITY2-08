import bcrypt from "bcryptjs";
import { query } from "@/lib/db";

let schemaReady: Promise<void> | undefined;

export type AppUser = {
  id: string;
  email: string;
  name: string;
};

export type StoredFile = {
  id: string;
  name: string;
  pathname: string;
  contentType: string;
  size: number;
  folder: string;
  isShared: boolean;
  createdAt: string;
};

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await query(`CREATE TABLE IF NOT EXISTS app_users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
      await query(`CREATE TABLE IF NOT EXISTS file_folders (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(user_id, name))`);
      await query(`CREATE TABLE IF NOT EXISTS stored_files (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, folder_id TEXT, name TEXT NOT NULL, pathname TEXT UNIQUE NOT NULL, content_type TEXT NOT NULL, size BIGINT NOT NULL, is_shared BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
      await query(`CREATE INDEX IF NOT EXISTS stored_files_user_id_idx ON stored_files(user_id, created_at DESC)`);
    })();
  }
  return schemaReady;
}

export async function createUser(email: string, password: string, name: string) {
  await ensureSchema();
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await query(`SELECT id FROM app_users WHERE email = $1`, [normalizedEmail]);
  if (existing.rowCount) throw new Error("ACCOUNT_EXISTS");
  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, 12);
  await query(`INSERT INTO app_users (id, email, name, password_hash) VALUES ($1, $2, $3, $4)`, [id, normalizedEmail, name.trim(), passwordHash]);
  return { id, email: normalizedEmail, name: name.trim() } satisfies AppUser;
}

export async function verifyUser(email: string, password: string) {
  await ensureSchema();
  const result = await query(`SELECT id, email, name, password_hash FROM app_users WHERE email = $1`, [email.trim().toLowerCase()]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) return null;
  return { id: user.id, email: user.email, name: user.name } satisfies AppUser;
}

export async function getFiles(userId: string) {
  await ensureSchema();
  const result = await query(`SELECT f.id, f.name, f.pathname, f.content_type, f.size, COALESCE(d.name, 'My files') AS folder, f.is_shared, f.created_at FROM stored_files f LEFT JOIN file_folders d ON d.id = f.folder_id WHERE f.user_id = $1 ORDER BY f.created_at DESC`, [userId]);
  return result.rows.map((file) => ({ id: file.id, name: file.name, pathname: file.pathname, contentType: file.content_type, size: Number(file.size), folder: file.folder, isShared: file.is_shared, createdAt: file.created_at.toISOString() })) as StoredFile[];
}

export async function saveFile(userId: string, file: Omit<StoredFile, "id" | "createdAt" | "folder" | "isShared">, folderName = "My files") {
  await ensureSchema();
  const folderId = crypto.randomUUID();
  await query(`INSERT INTO file_folders (id, user_id, name) VALUES ($1, $2, $3) ON CONFLICT (user_id, name) DO NOTHING`, [folderId, userId, folderName]);
  const folder = await query(`SELECT id FROM file_folders WHERE user_id = $1 AND name = $2`, [userId, folderName]);
  const id = crypto.randomUUID();
  await query(`INSERT INTO stored_files (id, user_id, folder_id, name, pathname, content_type, size) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [id, userId, folder.rows[0].id, file.name, file.pathname, file.contentType, file.size]);
  return id;
}

export async function getOwnedFile(userId: string, id: string) {
  await ensureSchema();
  const result = await query(`SELECT id, pathname, name, content_type FROM stored_files WHERE id = $1 AND user_id = $2`, [id, userId]);
  return result.rows[0] ?? null;
}

export async function deleteOwnedFile(userId: string, id: string) {
  await ensureSchema();
  const result = await query(`DELETE FROM stored_files WHERE id = $1 AND user_id = $2 RETURNING pathname`, [id, userId]);
  return result.rows[0] ?? null;
}

export async function setShared(userId: string, id: string, shared: boolean) {
  await ensureSchema();
  await query(`UPDATE stored_files SET is_shared = $1 WHERE id = $2 AND user_id = $3`, [shared, id, userId]);
}

export async function getShareFile(id: string) {
  await ensureSchema();
  const result = await query(`SELECT id, pathname, name, content_type FROM stored_files WHERE id = $1 AND is_shared = TRUE`, [id]);
  return result.rows[0] ?? null;
}

export async function getUserCount(userId: string) {
  await ensureSchema();
  const result = await query(`SELECT COUNT(*)::int AS count FROM stored_files WHERE user_id = $1`, [userId]);
  return result.rows[0].count as number;
}

export { ensureSchema };
