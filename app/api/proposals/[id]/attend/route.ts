import { getDb } from "@/lib/db";
import { findMember, jsonError } from "@/lib/api-helpers";
import { runSchedulerTick } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

// 提案への応募 / 応募取り消し { name, join }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const proposalId = Number(id);
  const body = await req.json();
  const { name, join } = body;

  if (typeof name !== "string") return jsonError("名前が必要です");
  const member = await findMember(name);
  if (!member) return jsonError("メンバーが見つかりません", 404);

  const db = await getDb();
  const rs = await db.execute({
    sql: "SELECT id, status FROM proposals WHERE id = ?",
    args: [proposalId],
  });
  const proposal = rs.rows[0] as unknown as
    | { id: number; status: string }
    | undefined;
  if (!proposal) return jsonError("提案が見つかりません", 404);
  if (proposal.status === "expired") return jsonError("この提案は終了しました");

  if (join) {
    await db.execute({
      sql: "INSERT OR IGNORE INTO attendees (proposal_id, member_id) VALUES (?, ?)",
      args: [proposalId, member.id],
    });
  } else {
    if (proposal.status === "confirmed") {
      return jsonError("開催確定後のキャンセルは幹事に直接どうぞ🙏");
    }
    await db.execute({
      sql: "DELETE FROM attendees WHERE proposal_id = ? AND member_id = ?",
      args: [proposalId, member.id],
    });
  }

  // 応募で成立ラインに達したら即確定させる
  await runSchedulerTick();

  const after = await db.execute({
    sql: "SELECT status FROM proposals WHERE id = ?",
    args: [proposalId],
  });
  const status = (after.rows[0] as unknown as { status: string }).status;

  return Response.json({ ok: true, status });
}
