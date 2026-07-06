import { getDb, getDefaultMinCount, getMeta, setMeta } from "./db";
import { sendPushToAll } from "./push";
import {
  addDays,
  dayOfWeek,
  daysBetween,
  formatJa,
  Slot,
  SLOT_LABEL,
  todayJST,
} from "./dates";

// ハイブリッド自動開催エンジン。
// API アクセスのたびに走らせる（サーバーレスでも動く lazy 実行）。
//
// 1. 期限切れ処理: 過去日の open 提案を expired に
// 2. 空き集計: 直近35日で成立人数以上のメンバーが空いている(日付,時間帯)に自動提案
// 3. ランダム提案: 予定が何もなく、前回から7日以上空いたらガチャ提案を発行
// 4. 成立判定: 応募が min_count に達した提案を confirmed に

const LOOKAHEAD_DAYS = 35;
const RANDOM_INTERVAL_DAYS = 7;

export async function runSchedulerTick(): Promise<void> {
  const db = getDb();
  const today = todayJST();
  const notifications: { title: string; body: string; tag: string }[] = [];

  // --- 1. 期限切れ ---
  db.prepare(
    "UPDATE proposals SET status = 'expired' WHERE status = 'open' AND date < ?"
  ).run(today);

  // --- 2. 空きが重なった日に自動提案 ---
  const minCount = getDefaultMinCount();
  const horizon = addDays(today, LOOKAHEAD_DAYS);
  const hotSlots = db
    .prepare(
      `SELECT date, slot, COUNT(DISTINCT member_id) AS cnt
       FROM availability
       WHERE date >= ? AND date <= ?
       GROUP BY date, slot
       HAVING cnt >= ?`
    )
    .all(today, horizon, minCount) as { date: string; slot: Slot; cnt: number }[];

  const hasProposal = db.prepare(
    "SELECT 1 FROM proposals WHERE date = ? AND slot = ? AND status != 'expired'"
  );
  const insertProposal = db.prepare(
    `INSERT INTO proposals (date, slot, title, min_count, source) VALUES (?, ?, ?, ?, ?)`
  );

  for (const hot of hotSlots) {
    if (hasProposal.get(hot.date, hot.slot)) continue;
    insertProposal.run(
      hot.date,
      hot.slot,
      `${hot.cnt}人の空きが重なった日🍻`,
      minCount,
      "auto"
    );
    notifications.push({
      title: "飲み会チャンス発見！🍺",
      body: `${formatJa(hot.date)} ${SLOT_LABEL[hot.slot]} に${hot.cnt}人が空いてる！今すぐ応募しよう`,
      tag: `auto-${hot.date}-${hot.slot}`,
    });
  }

  // --- 3. ランダム提案（ガチャ） ---
  const upcoming = db
    .prepare(
      "SELECT COUNT(*) AS cnt FROM proposals WHERE date >= ? AND status IN ('open','confirmed')"
    )
    .get(today) as { cnt: number };
  const lastRandom = getMeta("last_random_at");
  const memberCount = (
    db.prepare("SELECT COUNT(*) AS cnt FROM members").get() as { cnt: number }
  ).cnt;

  const randomDue =
    !lastRandom || daysBetween(lastRandom, today) >= RANDOM_INTERVAL_DAYS;

  if (upcoming.cnt === 0 && randomDue && memberCount >= 2) {
    const date = pickRandomDate(today);
    const slot: Slot = Math.random() < 0.5 ? "early" : "late";
    insertProposal.run(date, slot, "運命のランダム提案🎲", minCount, "random");
    setMeta("last_random_at", today);
    notifications.push({
      title: "運命の飲み会ガチャが届いた🎲",
      body: `${formatJa(date)} ${SLOT_LABEL[slot]}、どう？ ${minCount}人集まったら開催！`,
      tag: `random-${date}-${slot}`,
    });
  }

  // --- 4. 成立判定 ---
  const ripe = db
    .prepare(
      `SELECT p.id, p.date, p.slot, COUNT(a.member_id) AS cnt
       FROM proposals p
       JOIN attendees a ON a.proposal_id = p.id
       WHERE p.status = 'open'
       GROUP BY p.id
       HAVING cnt >= p.min_count`
    )
    .all() as { id: number; date: string; slot: Slot; cnt: number }[];

  const confirm = db.prepare(
    "UPDATE proposals SET status = 'confirmed', confirmed_at = datetime('now') WHERE id = ?"
  );
  for (const p of ripe) {
    confirm.run(p.id);
    notifications.push({
      title: "🎉 飲み会開催決定！！",
      body: `${formatJa(p.date)} ${SLOT_LABEL[p.slot]}、${p.cnt}人で乾杯だ！`,
      tag: `confirmed-${p.id}`,
    });
  }

  // 通知はまとめて送信（失敗してもアプリ本体には影響させない）
  for (const n of notifications) {
    try {
      await sendPushToAll(n);
    } catch {
      // push はベストエフォート
    }
  }
}

// 7〜21日先、金・土を優先してランダムに1日選ぶ
function pickRandomDate(today: string): string {
  const candidates: string[] = [];
  const weekend: string[] = [];
  for (let i = 7; i <= 21; i++) {
    const d = addDays(today, i);
    const dow = dayOfWeek(d);
    candidates.push(d);
    if (dow === 5 || dow === 6) weekend.push(d);
  }
  const pool = weekend.length > 0 && Math.random() < 0.7 ? weekend : candidates;
  return pool[Math.floor(Math.random() * pool.length)];
}
