import { getDb } from "@/lib/db";
import {
  findMember,
  isValidDate,
  isValidSlot,
  jsonError,
} from "@/lib/api-helpers";
import { todayJST } from "@/lib/dates";

export const dynamic = "force-dynamic";

// 空き登録のトグル { name, date, slot, available }
export async function POST(req: Request) {
  const body = await req.json();
  const { name, date, slot, available } = body;

  if (typeof name !== "string") return jsonError("名前が必要です");
  const member = await findMember(name);
  if (!member) return jsonError("メンバーが見つかりません", 404);
  if (!isValidDate(date)) return jsonError("日付の形式が不正です");
  if (!isValidSlot(slot)) return jsonError("時間帯が不正です");
  if (date < todayJST()) return jsonError("過去の日付には登録できません");

  const db = await getDb();
  if (available) {
    await db.execute({
      sql: "INSERT OR IGNORE INTO availability (member_id, date, slot) VALUES (?, ?, ?)",
      args: [member.id, date, slot],
    });
  } else {
    await db.execute({
      sql: "DELETE FROM availability WHERE member_id = ? AND date = ? AND slot = ?",
      args: [member.id, date, slot],
    });
  }
  return Response.json({ ok: true });
}
