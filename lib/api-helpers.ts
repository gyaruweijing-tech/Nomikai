import { getDb } from "./db";

export interface Member {
  id: number;
  name: string;
}

export function findOrCreateMember(name: string): Member {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 20) {
    throw new Error("名前は1〜20文字で入力してください");
  }
  const db = getDb();
  db.prepare("INSERT OR IGNORE INTO members (name) VALUES (?)").run(trimmed);
  return db
    .prepare("SELECT id, name FROM members WHERE name = ?")
    .get(trimmed) as Member;
}

export function findMember(name: string): Member | null {
  const row = getDb()
    .prepare("SELECT id, name FROM members WHERE name = ?")
    .get(name.trim()) as Member | undefined;
  return row ?? null;
}

export function isValidDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export function isValidSlot(s: unknown): s is "early" | "late" {
  return s === "early" || s === "late";
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
