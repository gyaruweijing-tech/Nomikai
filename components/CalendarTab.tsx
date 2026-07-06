"use client";

import { useMemo, useState } from "react";
import { AppState, Slot, SLOT_LABEL, formatJa } from "@/lib/client";

// 月表示カレンダー。日付をタップして早め/遅めの空きをトグルする。
export default function CalendarTab({
  state,
  busy,
  onToggle,
}: {
  state: AppState;
  busy: boolean;
  onToggle: (date: string, slot: Slot, available: boolean) => void;
}) {
  const myName = state.me?.name ?? "";
  const [ym, setYm] = useState(() => state.today.slice(0, 7)); // "YYYY-MM"
  const [selected, setSelected] = useState<string | null>(null);

  const [year, month] = ym.split("-").map(Number);

  // 日付 → 空き登録者マップ
  const byDate = useMemo(() => {
    const map = new Map<string, { early: string[]; late: string[] }>();
    for (const a of state.availability) {
      const entry = map.get(a.date) ?? { early: [], late: [] };
      entry[a.slot].push(a.name);
      map.set(a.date, entry);
    }
    return map;
  }, [state.availability]);

  const eventDates = useMemo(
    () =>
      new Set(
        state.proposals
          .filter((p) => p.status === "confirmed")
          .map((p) => p.date)
      ),
    [state.proposals]
  );

  const cells = useMemo(() => {
    const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const list: (string | null)[] = Array(firstDow).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      list.push(
        `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      );
    }
    return list;
  }, [year, month]);

  const moveMonth = (delta: number) => {
    const dt = new Date(Date.UTC(year, month - 1 + delta, 1));
    setYm(dt.toISOString().slice(0, 7));
    setSelected(null);
  };

  const sel = selected ? byDate.get(selected) ?? { early: [], late: [] } : null;

  return (
    <div>
      <div className="cal-nav">
        <button onClick={() => moveMonth(-1)} aria-label="前の月">
          ←
        </button>
        <h2>
          {year}年{month}月
        </h2>
        <button onClick={() => moveMonth(1)} aria-label="次の月">
          →
        </button>
      </div>

      <div className="cal-grid">
        {["日", "月", "火", "水", "木", "金", "土"].map((d, i) => (
          <div
            key={d}
            className={`cal-dow${i === 0 ? " sun" : i === 6 ? " sat" : ""}`}
          >
            {d}
          </div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={`e${i}`} className="cal-cell empty" />;
          const past = date < state.today;
          const entry = byDate.get(date);
          const mine =
            !!entry &&
            (entry.early.includes(myName) || entry.late.includes(myName));
          const othersCount = entry
            ? new Set(
                [...entry.early, ...entry.late].filter((n) => n !== myName)
              ).size
            : 0;
          const hasEvent = eventDates.has(date);
          const cls = [
            "cal-cell",
            date === state.today ? "today" : "",
            date === selected ? "selected" : "",
            mine ? "mine" : "",
            hasEvent ? "has-event" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={date}
              className={cls}
              disabled={past}
              onClick={() => setSelected(date === selected ? null : date)}
            >
              {othersCount > 0 && (
                <span className="cal-count">+{othersCount}</span>
              )}
              <span>{Number(date.slice(8))}</span>
              <span className="cal-dots">
                {mine && <span className="dot mine" />}
                {othersCount > 0 && <span className="dot others" />}
                {hasEvent && <span className="dot event" />}
              </span>
            </button>
          );
        })}
      </div>

      {selected && sel && (
        <div className="card day-sheet" style={{ marginTop: 14 }}>
          <h3>{formatJa(selected)} の空き登録</h3>
          {(["early", "late"] as Slot[]).map((slot) => {
            const on = sel[slot].includes(myName);
            const others = sel[slot].filter((n) => n !== myName);
            return (
              <div key={slot} className="slot-row">
                <button
                  className={`slot-toggle${on ? " on" : ""}`}
                  disabled={busy}
                  onClick={() => onToggle(selected, slot, !on)}
                >
                  {on ? "✓ " : ""}
                  {SLOT_LABEL[slot]}
                </button>
                <div className="slot-people">
                  {others.length > 0
                    ? `🙋 ${others.join("、")} も空いてる`
                    : "まだ誰も登録してない…一番乗り！"}
                </div>
              </div>
            );
          })}
          <p
            style={{
              fontSize: 12,
              color: "var(--text-sub)",
              marginTop: 10,
            }}
          >
            💡 {state.settings.defaultMinCount}人の空きが重なると、自動で飲み会提案が生まれます
          </p>
        </div>
      )}

      {!selected && (
        <p className="empty-note">
          日付をタップして「空いてる日」を登録しよう！
          <br />
          🟡 = 自分の空き / ⚪ = 誰かの空き / 🟢 = 開催決定日
        </p>
      )}
    </div>
  );
}
