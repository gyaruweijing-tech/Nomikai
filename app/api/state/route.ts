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

  const db = getDb();
  const today = todayJST();
  const name = req.nextUrl.searchParams.get("name") ?? "";
  const me = name ? findMember(name) : null;

  const members = db
    .prepare("SELECT id, name FROM members ORDER BY created_at")
    .all();

  const availability = db
    .prepare(
      `SELECT a.date, a.slot, m.name
       FROM availability a JOIN members m ON m.id = a.member_id
       WHERE a.date >= ?
       ORDER BY a.date`
    )
    .all(addDays(today, -1));

  const proposals = db
    .prepare(
      `SELECT p.id, p.date, p.slot, p.title, p.min_count AS minCount,
              p.source, p.status, p.confirmed_at AS confirmedAt,
              cm.name AS createdBy
       FROM proposals p LEFT JOIN members cm ON cm.id = p.created_by
       WHERE p.date >= ? OR p.status = 'confirmed'
       ORDER BY p.date`
    )
    .all(today) as { id: number; [k: string]: unknown }[];

  const attendeeRows = db
    .prepare(
      `SELECT a.proposal_id AS proposalId, m.name
       FROM attendees a JOIN members m ON m.id = a.member_id
       ORDER BY a.joined_at`
    )
    .all() as { proposalId: number; name: string }[];

  const attendeesByProposal = new Map<number, string[]>();
  for (const row of attendeeRows) {
    const list = attendeesByProposal.get(row.proposalId) ?? [];
    list.push(row.name);
    attendeesByProposal.set(row.proposalId, list);
  }
  for (const p of proposals) {
    p.attendees = attendeesByProposal.get(p.id) ?? [];
  }

  // 通算開催数（モチベ用）
  const kanpaiCount = (
    db
      .prepare("SELECT COUNT(*) AS cnt FROM proposals WHERE status = 'confirmed'")
      .get() as { cnt: number }
  ).cnt;

  return Response.json({
    today,
    me,
    members,
    availability,
    proposals,
    kanpaiCount,
    settings: { defaultMinCount: getDefaultMinCount() },
    vapidPublicKey: getVapidPublicKey(),
  });
}
