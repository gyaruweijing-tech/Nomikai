"use client";

import {
  AppState,
  SLOT_LABEL,
  formatJa,
  daysUntil,
} from "@/lib/client";
import ProposalCard from "./ProposalCard";

export default function HomeTab({
  state,
  busy,
  onAttend,
  onEnablePush,
  pushEnabled,
}: {
  state: AppState;
  busy: boolean;
  onAttend: (id: number, join: boolean) => void;
  onEnablePush: () => void;
  pushEnabled: boolean;
}) {
  const myName = state.me?.name ?? "";
  const upcoming = state.proposals.filter((p) => p.date >= state.today);
  const nextConfirmed = upcoming
    .filter((p) => p.status === "confirmed")
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const openProposals = upcoming
    .filter((p) => p.status === "open")
    .sort((a, b) => a.date.localeCompare(b.date));

  const days = nextConfirmed ? daysUntil(state.today, nextConfirmed.date) : 0;

  return (
    <div>
      {nextConfirmed ? (
        <div className="card hero">
          <div className="hero-eyebrow">NEXT 飲み会 🍻</div>
          <div className="hero-date">{formatJa(nextConfirmed.date)}</div>
          <div className="hero-slot">{SLOT_LABEL[nextConfirmed.slot]}</div>
          <div className="hero-countdown">
            {days === 0 ? "🔥 今日だ！！" : `あと ${days} 日`}
          </div>
          <div className="hero-members">
            🙋 {nextConfirmed.attendees.join("、")}
          </div>
        </div>
      ) : (
        <div className="card hero-empty">
          <span className="big">🍺</span>
          <p>
            次の飲み会はまだ未定…
            <br />
            カレンダーに空きを登録すると自動で提案が生まれるよ！
          </p>
        </div>
      )}

      {!pushEnabled && (
        <button className="notice" onClick={onEnablePush} style={{ width: "100%", textAlign: "left", cursor: "pointer" }}>
          🔔 プッシュ通知をONにすると、提案や開催決定をすぐキャッチできます（タップで設定）
        </button>
      )}

      <div className="stats-row">
        <div className="stat-tile">
          <div className="num">{state.kanpaiCount}</div>
          <div className="label">通算開催 🍻</div>
        </div>
        <div className="stat-tile">
          <div className="num">{state.members.length}</div>
          <div className="label">メンバー 👥</div>
        </div>
        <div className="stat-tile">
          <div className="num">{openProposals.length}</div>
          <div className="label">募集中 📣</div>
        </div>
      </div>

      <div className="section-label">募集中の提案</div>
      {openProposals.length === 0 ? (
        <p className="empty-note">
          いま募集中の提案はありません。
          <br />
          「提案」タブから幹事になって立てることもできます！
        </p>
      ) : (
        openProposals.map((p) => (
          <ProposalCard
            key={p.id}
            proposal={p}
            myName={myName}
            today={state.today}
            busy={busy}
            onAttend={onAttend}
          />
        ))
      )}

      <div className="section-label">メンバー</div>
      <div className="card">
        <div className="attendee-chips" style={{ margin: 0 }}>
          {state.members.map((m) => (
            <span
              key={m.id}
              className={`chip${m.name === myName ? " me" : ""}`}
            >
              {m.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
