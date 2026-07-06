"use client";

import { useState } from "react";
import { AppState, Slot, SLOT_LABEL } from "@/lib/client";
import ProposalCard from "./ProposalCard";

export default function ProposalsTab({
  state,
  busy,
  onAttend,
  onCreate,
  onSaveSettings,
}: {
  state: AppState;
  busy: boolean;
  onAttend: (id: number, join: boolean) => void;
  onCreate: (p: {
    date: string;
    slot: Slot;
    minCount: number;
    title: string;
  }) => Promise<void>;
  onSaveSettings: (n: number) => Promise<void>;
}) {
  const myName = state.me?.name ?? "";
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState<Slot>("late");
  const [minCount, setMinCount] = useState(state.settings.defaultMinCount);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

  const [defaultMin, setDefaultMin] = useState(state.settings.defaultMinCount);

  const upcoming = state.proposals
    .filter((p) => p.date >= state.today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const open = upcoming.filter((p) => p.status === "open");
  const confirmed = upcoming.filter((p) => p.status === "confirmed");

  const submit = async () => {
    setError("");
    if (!date) {
      setError("日付を選んでください");
      return;
    }
    try {
      await onCreate({ date, slot, minCount, title });
      setShowForm(false);
      setDate("");
      setTitle("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "作成に失敗しました");
    }
  };

  return (
    <div>
      {!showForm ? (
        <button
          className="btn primary"
          style={{ marginBottom: 6 }}
          onClick={() => setShowForm(true)}
        >
          📣 幹事になって提案を立てる
        </button>
      ) : (
        <div className="card">
          <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 14 }}>
            新しい飲み会を提案 📣
          </h3>
          <div className="form-row">
            <label>日付</label>
            <input
              type="date"
              min={state.today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="form-row">
            <label>時間帯</label>
            <div className="seg">
              {(["early", "late"] as Slot[]).map((s) => (
                <button
                  key={s}
                  className={slot === s ? "on" : ""}
                  onClick={() => setSlot(s)}
                >
                  {SLOT_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
          <div className="form-row">
            <label>成立人数（この人数が集まったら開催決定）</label>
            <div className="stepper">
              <button onClick={() => setMinCount((n) => Math.max(2, n - 1))}>
                −
              </button>
              <span className="num">{minCount}人</span>
              <button onClick={() => setMinCount((n) => Math.min(50, n + 1))}>
                ＋
              </button>
            </div>
          </div>
          <div className="form-row">
            <label>ひとこと（任意）</label>
            <input
              type="text"
              placeholder="例: 新橋で餃子とビール！"
              maxLength={40}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          {error && (
            <p style={{ color: "var(--danger)", fontSize: 13, marginBottom: 10 }}>
              {error}
            </p>
          )}
          <button className="btn primary" disabled={busy} onClick={submit}>
            提案を出す🍻（自分は自動で応募済みに）
          </button>
          <button
            className="btn ghost"
            style={{ marginTop: 8 }}
            onClick={() => setShowForm(false)}
          >
            やめる
          </button>
        </div>
      )}

      <div className="section-label">募集中</div>
      {open.length === 0 ? (
        <p className="empty-note">募集中の提案はありません</p>
      ) : (
        open.map((p) => (
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

      {confirmed.length > 0 && (
        <>
          <div className="section-label">開催決定 🎉</div>
          {confirmed.map((p) => (
            <ProposalCard
              key={p.id}
              proposal={p}
              myName={myName}
              today={state.today}
              busy={busy}
              onAttend={onAttend}
            />
          ))}
        </>
      )}

      <div className="section-label">グループ設定</div>
      <div className="card">
        <div className="form-row" style={{ marginBottom: 8 }}>
          <label>
            自動提案の成立人数（{defaultMin}人の空きが重なると自動提案）
          </label>
          <div className="stepper">
            <button onClick={() => setDefaultMin((n) => Math.max(2, n - 1))}>
              −
            </button>
            <span className="num">{defaultMin}人</span>
            <button onClick={() => setDefaultMin((n) => Math.min(50, n + 1))}>
              ＋
            </button>
          </div>
        </div>
        {defaultMin !== state.settings.defaultMinCount && (
          <button
            className="btn primary"
            disabled={busy}
            onClick={() => onSaveSettings(defaultMin)}
          >
            保存する
          </button>
        )}
      </div>
    </div>
  );
}
