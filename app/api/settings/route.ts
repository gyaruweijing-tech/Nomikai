import { setMeta } from "@/lib/db";
import { jsonError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

// グループ設定の更新 { defaultMinCount }
// 自動提案・ランダム提案の成立人数のデフォルト値。
export async function POST(req: Request) {
  const body = await req.json();
  const n = Number(body.defaultMinCount);
  if (!Number.isInteger(n) || n < 2 || n > 50) {
    return jsonError("成立人数は2〜50人で設定してください");
  }
  setMeta("default_min_count", String(n));
  return Response.json({ ok: true });
}
