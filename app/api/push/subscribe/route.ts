import { getDb } from "@/lib/db";
import { findMember, jsonError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

// Web Push の購読登録 { name, subscription }
export async function POST(req: Request) {
  const body = await req.json();
  const { name, subscription } = body;

  if (typeof name !== "string") return jsonError("名前が必要です");
  const member = await findMember(name);
  if (!member) return jsonError("メンバーが見つかりません", 404);

  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const auth = subscription?.keys?.auth;
  if (
    typeof endpoint !== "string" ||
    typeof p256dh !== "string" ||
    typeof auth !== "string"
  ) {
    return jsonError("購読情報が不正です");
  }

  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO push_subscriptions (member_id, endpoint, p256dh, auth)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(endpoint) DO UPDATE SET
            member_id = excluded.member_id,
            p256dh = excluded.p256dh,
            auth = excluded.auth`,
    args: [member.id, endpoint, p256dh, auth],
  });

  return Response.json({ ok: true });
}
