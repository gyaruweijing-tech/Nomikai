"use client";

import { Proposal, SLOT_LABEL, formatJa, daysUntil } from "@/lib/client";

const SOURCE_BADGE: Record<Proposal["source"], { label: string; cls: string }> =
  {
    auto: { label: "🤖 自動検出", cls: "auto" },
    random: { label: "🎲 ランダム", cls: "random" },
    manual: { label: "📣 幹事発", cls: "manual" },
  };

export default function ProposalCard({
  proposal,
  myName,
  today,
  busy,
  onAttend,
}: {
  proposal: Proposal;
  myName: string;
  today: string;
  busy: boolean;
  onAttend: (id: number, join: boolean) => void;
}) {
  const p = proposal;
  const joined = p.attendees.includes(myName);
  const confirmed = p.status === "confirmed";
  const pct = Math.min(100, Math.round((p.attendees.length / p.minCount) * 100));
  const remain = Math.max(0, p.minCount - p.attendees.length);
  const days = daysUntil(today, p.date);
  const badge = SOURCE_BADGE[p.source];

  return (
    <div className="card">
      <div className="proposal-head">
        <div>
          <div className="proposal-date">
            {formatJa(p.date)}
            {days === 0 && " 🔥今日！"}
            {days === 1 && " ⏰明日"}
          </div>
          <div className="proposal-slot">{SLOT_LABEL[p.slot]}</div>
        </div>
        <span className={`badge ${confirmed ? "confirmed" : badge.cls}`}>
          {confirmed ? "🎉 開催決定" : badge.label}
        </span>
      </div>

      <p className="proposal-title">
        {p.title}
        {p.createdBy ? `（幹事: ${p.createdBy}）` : ""}
      </p>

      <div className="progress-track">
        <div
          className={`progress-fill${confirmed ? " done" : ""}`}
          style={{ width: `${confirmed ? 100 : pct}%` }}
        />
      </div>
      <div className="progress-label">
        <span>
          {p.attendees.length} / {p.minCount}人
        </span>
        <span>
          {confirmed
            ? "成立！🍻"
            : remain === 0
              ? "まもなく成立…"
              : `あと${remain}人で開催！`}
        </span>
      </div>

      {p.attendees.length > 0 && (
        <div className="attendee-chips">
          {p.attendees.map((name) => (
            <span key={name} className={`chip${name === myName ? " me" : ""}`}>
              {name}
            </span>
          ))}
        </div>
      )}

      {confirmed && joined ? (
        <button className="btn confirmed" disabled>
          ✅ 参加確定！当日を楽しみに
        </button>
      ) : joined ? (
        <button
          className="btn ghost"
          disabled={busy}
          onClick={() => onAttend(p.id, false)}
        >
          応募済み（タップで取り消し）
        </button>
      ) : (
        <button
          className="btn primary"
          disabled={busy}
          onClick={() => onAttend(p.id, true)}
        >
          🍺 行く！
        </button>
      )}
    </div>
  );
}
