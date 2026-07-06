import { findOrCreateMember, jsonError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

// 名前だけでメンバー登録（既存の名前ならその人として続きから使える）
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (typeof body.name !== "string") return jsonError("名前が必要です");
    const member = findOrCreateMember(body.name);
    return Response.json({ member });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "登録に失敗しました");
  }
}
