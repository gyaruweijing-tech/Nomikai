import webpush from "web-push";
import { getDb, getMeta, setMeta } from "./db";

// VAPID キーは初回起動時に自動生成して DB に保存する（設定不要で動く）
function ensureVapid(): { publicKey: string; privateKey: string } {
  let publicKey = getMeta("vapid_public");
  let privateKey = getMeta("vapid_private");
  if (!publicKey || !privateKey) {
    const keys = webpush.generateVAPIDKeys();
    publicKey = keys.publicKey;
    privateKey = keys.privateKey;
    setMeta("vapid_public", publicKey);
    setMeta("vapid_private", privateKey);
  }
  return { publicKey, privateKey };
}

export function getVapidPublicKey(): string {
  return ensureVapid().publicKey;
}

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
}

export async function sendPushToAll(payload: PushPayload): Promise<void> {
  const db = getDb();
  const subs = db
    .prepare("SELECT id, endpoint, p256dh, auth FROM push_subscriptions")
    .all() as { id: number; endpoint: string; p256dh: string; auth: string }[];
  if (subs.length === 0) return;

  const { publicKey, privateKey } = ensureVapid();
  webpush.setVapidDetails("mailto:nomikai@example.com", publicKey, privateKey);

  const body = JSON.stringify(payload);
  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          // 失効した購読は掃除する
          db.prepare("DELETE FROM push_subscriptions WHERE id = ?").run(s.id);
        }
      }
    })
  );
}
