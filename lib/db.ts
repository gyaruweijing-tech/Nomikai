import { createClient, type Client } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

// Turso (libSQL) クライアント。
// TURSO_DATABASE_URL / TURSO_AUTH_TOKEN があればリモートDB、
// なければローカルファイル data/nomikai.db にフォールバック（開発用）。

let client: Client | null = null;
let schemaReady: Promise<void> | null = null;

function localFileUrl(): string {
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  return `file:${path.join(dir, "nomikai.db")}`;
}

function getClient(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL || localFileUrl();
    client = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

export async function getDb(): Promise<Client> {
  const c = getClient();
  if (!schemaReady) {
    schemaReady = migrate(c).catch((e) => {
      schemaReady = null; // 失敗したら次のリクエストで再試行
      throw e;
    });
  }
  await schemaReady;
  return c;
}

async function migrate(c: Client) {
  await c.executeMultiple(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS availability (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      date TEXT NOT NULL,           -- YYYY-MM-DD (JST)
      slot TEXT NOT NULL,           -- 'early' | 'late'
      UNIQUE(member_id, date, slot)
    );

    CREATE TABLE IF NOT EXISTS proposals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      slot TEXT NOT NULL,
      title TEXT NOT NULL,
      min_count INTEGER NOT NULL,
      source TEXT NOT NULL,         -- 'auto' | 'random' | 'manual'
      status TEXT NOT NULL DEFAULT 'open', -- 'open' | 'confirmed' | 'expired'
      created_by INTEGER REFERENCES members(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      confirmed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS attendees (
      proposal_id INTEGER NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
      member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(proposal_id, member_id)
    );

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

export async function getMeta(key: string): Promise<string | null> {
  const db = await getDb();
  const rs = await db.execute({
    sql: "SELECT value FROM meta WHERE key = ?",
    args: [key],
  });
  return (rs.rows[0]?.value as string | undefined) ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    args: [key, value],
  });
}

// グループ設定（ワングループなので meta に持つ）
export async function getDefaultMinCount(): Promise<number> {
  const v = await getMeta("default_min_count");
  return v ? Math.max(2, parseInt(v, 10) || 3) : 3;
}
