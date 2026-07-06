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
  const member = findMember(name);
  if (!member) return jsonError("メンバーが見つかりません", 404);
  if (!isValidDate(date)) return jsonError("日付の形式が不正です");
  if (!isValidSlot(slot)) return jsonError("時間帯が不正です");
  if (date < todayJST()) return jsonError("過去の日付には登録できません");

  const db = getDb();
  if (available) {
    db.prepare(
      "INSERT OR IGNORE INTO availability (member_id, date, slot) VALUES (?, ?, ?)"
    ).run(member.id, date, slot);
  } else {
    db.prepare(
      "DELETE FROM availability WHERE member_id = ? AND date = ? AND slot = ?"
    ).run(member.id, date, slot);
  }
  return Response.json({ ok: true });
}
