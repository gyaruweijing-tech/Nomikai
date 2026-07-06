// クライアント側の型定義と API ヘルパー

export type Slot = "early" | "late";

export const SLOT_LABEL: Record<Slot, string> = {
  early: "早め 18:00〜",
  late: "遅め 20:00〜",
};

export interface Member {
  id: number;
  name: string;
}

export interface AvailabilityEntry {
  date: string;
  slot: Slot;
  name: string;
}

export interface Proposal {
  id: number;
  date: string;
  slot: Slot;
  title: string;
  minCount: number;
  source: "auto" | "random" | "manual";
  status: "open" | "confirmed" | "expired";
  confirmedAt: string | null;
  createdBy: string | null;
  attendees: string[];
}

export interface AppState {
  today: string;
  me: Member | null;
  members: Member[];
  availability: AvailabilityEntry[];
  proposals: Proposal[];
  kanpaiCount: number;
  settings: { defaultMinCount: number };
  vapidPublicKey: string;
}

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "通信エラーが発生しました");
  return data as T;
}

export const api = {
  state: (name: string) =>
    req<AppState>(`/api/state?name=${encodeURIComponent(name)}`),
  join: (name: string) =>
    req<{ member: Member }>("/api/join", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  setAvailability: (name: string, date: string, slot: Slot, available: boolean) =>
    req("/api/availability", {
      method: "POST",
      body: JSON.stringify({ name, date, slot, available }),
    }),
  createProposal: (p: {
    name: string;
    date: string;
    slot: Slot;
    minCount: number;
    title?: string;
  }) =>
    req<{ ok: true; id: number }>("/api/proposals", {
      method: "POST",
      body: JSON.stringify(p),
    }),
  attend: (id: number, name: string, join: boolean) =>
    req<{ ok: true; status: Proposal["status"] }>(
      `/api/proposals/${id}/attend`,
      { method: "POST", body: JSON.stringify({ name, join }) }
    ),
  saveSettings: (defaultMinCount: number) =>
    req("/api/settings", {
      method: "POST",
      body: JSON.stringify({ defaultMinCount }),
    }),
  subscribePush: (name: string, subscription: PushSubscriptionJSON) =>
    req("/api/push/subscribe", {
      method: "POST",
      body: JSON.stringify({ name, subscription }),
    }),
};

// ---- Web Push ----

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function enablePush(
  name: string,
  vapidPublicKey: string
): Promise<boolean> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return false;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });
    }
    await api.subscribePush(name, sub.toJSON());
    return true;
  } catch {
    return false;
  }
}

export function registerServiceWorker() {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
}

// ---- 日付ユーティリティ（クライアント用） ----

export function formatJa(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const youbi = ["日", "月", "火", "水", "木", "金", "土"][dow];
  return `${m}/${d}(${youbi})`;
}

export function daysUntil(today: string, target: string): number {
  const toMs = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toMs(target) - toMs(today)) / 86400000);
}
