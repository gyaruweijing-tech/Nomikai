import { NextRequest } from "next/server";
import { getDb, getDefaultMinCount } from "@/lib/db";
import { runSchedulerTick } from "@/lib/scheduler";
import { getVapidPublicKey } from "@/lib/push";
import { findMember } from "@/lib/api-helpers";
import { addDays, todayJST } from "@/lib/dates";

export const dynamic = "force-dynamic";

// アプリの全状態を返すブートストラップAPI。
// 呼ばれるたびにスケジューラを1tick回す（自動提案・成立判定・期限切れ処理）。
export async function GET(req: NextRequest) {
  await runSchedulerTick();

  const db = await getDb();
  const today = todayJST();
  const name = req.nextUrl.searchParams.get("name") ?? "";
  const me = name ? await findMember(name) : null;

  const members = (
    await db.execute("SELECT id, name FROM members ORDER BY created_at")
  ).rows;

  const availability = (
    await db.execute({
      sql: `SELECT a.date, a.slot, m.name
            FROM availability a JOIN members m ON m.id = a.member_id
            WHERE a.date >= ?
            ORDER BY a.date`,
      args: [addDays(today, -1)],
    })
  ).rows;

  const proposals = (
    await db.execute({
      sql: `SELECT p.id, p.date, p.slot, p.title, p.min_count AS minCount,
                   p.source, p.status, p.confirmed_at AS confirmedAt,
                   cm.name AS createdBy
            FROM proposals p LEFT JOIN members cm ON cm.id = p.created_by
            WHERE p.date >= ? OR p.status = 'confirmed'
            ORDER BY p.date`,
      args: [today],
    })
  ).rows as unknown as ({ id: number } & Record<string, unknown>)[];

  const attendeeRows = (
    await db.execute(
      `SELECT a.proposal_id AS proposalId, m.name
       FROM attendees a JOIN members m ON m.id = a.member_id
       ORDER BY a.joined_at`
    )
  ).rows as unknown as { proposalId: number; name: string }[];

  const attendeesByProposal = new Map<number, string[]>();
  for (const row of attendeeRows) {
    const list = attendeesByProposal.get(row.proposalId) ?? [];
    list.push(row.name);
    attendeesByProposal.set(row.proposalId, list);
  }
  const proposalsOut = proposals.map((p) => ({
    ...p,
    attendees: attendeesByProposal.get(p.id) ?? [],
  }));

  // 通算開催数（モチベ用）
  const kanpaiRs = await db.execute(
    "SELECT COUNT(*) AS cnt FROM proposals WHERE status = 'confirmed'"
  );
  const kanpaiCount = Number(kanpaiRs.rows[0].cnt);

  return Response.json({
    today,
    me,
    members,
    availability,
    proposals: proposalsOut,
    kanpaiCount,
    settings: { defaultMinCount: await getDefaultMinCount() },
    vapidPublicKey: await getVapidPublicKey(),
  });
}
