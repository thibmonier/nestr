/** Accès D1 : utilisateurs, sessions, tâches, préférences, identifiants. */

import { randomToken } from "./crypto.js";

export interface User {
  id: string;
  google_sub: string;
  email: string | null;
  name: string | null;
}

const SESSION_DAYS = 90;

function uuid(): string {
  return crypto.randomUUID();
}

/** Crée ou retrouve un utilisateur par son identifiant Google (sub). */
export async function upsertUser(
  db: D1Database,
  sub: string,
  email: string | null,
  name: string | null,
): Promise<User> {
  const existing = await db
    .prepare("SELECT id, google_sub, email, name FROM users WHERE google_sub = ?")
    .bind(sub)
    .first<User>();
  if (existing) return existing;

  const id = uuid();
  await db
    .prepare(
      "INSERT INTO users (id, google_sub, email, name, created_at) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(id, sub, email, name, new Date().toISOString())
    .run();
  return { id, google_sub: sub, email, name };
}

/** Crée une session et renvoie son token. */
export async function createSession(
  db: D1Database,
  userId: string,
): Promise<string> {
  const token = randomToken();
  const now = Date.now();
  await db
    .prepare(
      "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
    )
    .bind(
      token,
      userId,
      new Date(now).toISOString(),
      new Date(now + SESSION_DAYS * 86_400_000).toISOString(),
    )
    .run();
  return token;
}

/** Renvoie l'user_id d'un token de session valide, ou null. */
export async function userIdForSession(
  db: D1Database,
  token: string,
): Promise<string | null> {
  const row = await db
    .prepare("SELECT user_id, expires_at FROM sessions WHERE token = ?")
    .bind(token)
    .first<{ user_id: string; expires_at: string }>();
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  return row.user_id;
}

async function getBlob(
  db: D1Database,
  table: "tasks" | "preferences",
  userId: string,
): Promise<unknown | null> {
  const row = await db
    .prepare(`SELECT data FROM ${table} WHERE user_id = ?`)
    .bind(userId)
    .first<{ data: string }>();
  return row ? JSON.parse(row.data) : null;
}

async function setBlob(
  db: D1Database,
  table: "tasks" | "preferences",
  userId: string,
  data: unknown,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO ${table} (user_id, data, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
    )
    .bind(userId, JSON.stringify(data), new Date().toISOString())
    .run();
}

export const getTasks = (db: D1Database, u: string) => getBlob(db, "tasks", u);
export const setTasks = (db: D1Database, u: string, d: unknown) =>
  setBlob(db, "tasks", u, d);
export const getPreferences = (db: D1Database, u: string) =>
  getBlob(db, "preferences", u);
export const setPreferences = (db: D1Database, u: string, d: unknown) =>
  setBlob(db, "preferences", u, d);

/** Stocke un identifiant calendrier déjà chiffré. */
export async function setCredential(
  db: D1Database,
  userId: string,
  provider: "google" | "apple",
  enc: string,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO calendar_credentials (user_id, provider, enc, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, provider) DO UPDATE SET enc = excluded.enc, updated_at = excluded.updated_at`,
    )
    .bind(userId, provider, enc, new Date().toISOString())
    .run();
}

/** Renvoie le blob chiffré d'un identifiant, ou null. */
export async function getCredential(
  db: D1Database,
  userId: string,
  provider: "google" | "apple",
): Promise<string | null> {
  const row = await db
    .prepare(
      "SELECT enc FROM calendar_credentials WHERE user_id = ? AND provider = ?",
    )
    .bind(userId, provider)
    .first<{ enc: string }>();
  return row?.enc ?? null;
}
