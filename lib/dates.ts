// 日付はすべて Asia/Tokyo 基準の "YYYY-MM-DD" 文字列で扱う。
// サーバーが UTC で動いていても日本時間の「今日」がずれないようにする。

const JST_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function todayJST(): string {
  return JST_FMT.format(new Date());
}

export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function dayOfWeek(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function daysBetween(a: string, b: string): number {
  const toMs = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toMs(b) - toMs(a)) / 86400000);
}

export type Slot = "early" | "late";

export const SLOT_LABEL: Record<Slot, string> = {
  early: "早め (18:00〜)",
  late: "遅め (20:00〜)",
};

export function formatJa(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const youbi = ["日", "月", "火", "水", "木", "金", "土"][dayOfWeek(ymd)];
  return `${m}/${d}(${youbi})`;
}
