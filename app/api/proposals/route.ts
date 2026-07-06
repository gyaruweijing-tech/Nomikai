import { getDb } from "@/lib/db";
import {
  findMember,
  isValidDate,
  isValidSlot,
  jsonError,
} from "@/lib/api-helpers";
import { todayJST } from "@/lib/dates";
import { runSchedulerTick } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

// 幹事による手動提案 { name, date, slot, minCount, title? }
// 作成者は自動的に応募済みになる。
export async function POST(req: Request) {
  const body = await req.json();
  const { name, date, slot, title } = body;
  const minCount = Number(body.minCount);

  if (typeof name !== "string") return jsonError("名前が必要です");
  const member = await findMember(name);
  if (!member) return jsonError("メンバーが見つかりません", 404);
  if (!isValidDate(date)) return jsonError("日付の形式が不正です");
  if (!isValidSlot(slot)) return jsonError("時間帯が不正です");
  if (date < todayJST()) return jsonError("過去の日付は選べません");
  if (!Number.isInteger(minCount) || minCount < 2 || minCount > 50) {
    return jsonError("成立人数は2〜50人で設定してください");
  }

  const db = await getDb();
  const dup = await db.execute({
    sql: "SELECT 1 FROM proposals WHERE date = ? AND slot = ? AND status != 'expired'",
    args: [date, slot],
  });
  if (dup.rows.length > 0) {
    return jsonError("その日・その時間帯の提案はすでにあります");
  }

  const cleanTitle =
    typeof title === "string" && title.trim()
      ? title.trim().slice(0, 40)
      : "飲みたい人この指とまれ🍻";

  const result = await db.execute({
    sql: `INSERT INTO proposals (date, slot, title, min_count, source, created_by)
          VALUES (?, ?, ?, ?, 'manual', ?)`,
    args: [date, slot, cleanTitle, minCount, member.id],
  });
  const proposalId = Number(result.lastInsertRowid);
  await db.execute({
    sql: "INSERT INTO attendees (proposal_id, member_id) VALUES (?, ?)",
    args: [proposalId, member.id],
  });

  // 作成直後に成立する可能性もある（min=2で既に空きが揃う等）ので1tick回す
  await runSchedulerTick();

  return Response.json({ ok: true, id: proposalId });
}
