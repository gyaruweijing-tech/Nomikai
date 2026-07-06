import { getDb } from "./db";

export interface Member {
  id: number;
  name: string;
}

export async function findOrCreateMember(name: string): Promise<Member> {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 20) {
    throw new Error("名前は1〜20文字で入力してください");
  }
  const db = await getDb();
  await db.execute({
    sql: "INSERT OR IGNORE INTO members (name) VALUES (?)",
    args: [trimmed],
  });
  const rs = await db.execute({
    sql: "SELECT id, name FROM members WHERE name = ?",
    args: [trimmed],
  });
  return rs.rows[0] as unknown as Member;
}

export async function findMember(name: string): Promise<Member | null> {
  const db = await getDb();
  const rs = await db.execute({
    sql: "SELECT id, name FROM members WHERE name = ?",
    args: [name.trim()],
  });
  return (rs.rows[0] as unknown as Member | undefined) ?? null;
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
