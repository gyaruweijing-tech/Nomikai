"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  api,
  AppState,
  enablePush,
  registerServiceWorker,
  Slot,
} from "@/lib/client";
import HomeTab from "./HomeTab";
import CalendarTab from "./CalendarTab";
import ProposalsTab from "./ProposalsTab";
import Kanpai from "./Kanpai";

type Tab = "home" | "calendar" | "proposals";

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: "home", icon: "🏠", label: "ホーム" },
  { id: "calendar", icon: "📅", label: "カレンダー" },
  { id: "proposals", icon: "📣", label: "提案" },
];

export default function App({
  name,
  onLogout,
}: {
  name: string;
  onLogout: () => void;
}) {
  const [state, setState] = useState<AppState | null>(null);
  const [tab, setTab] = useState<Tab>("home");
  const [busy, setBusy] = useState(false);
  const [kanpai, setKanpai] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const confirmedIds = useRef<Set<number> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const s = await api.state(name);
      setLoadError(false);

      // 前回スナップショットと比べて、新たに confirmed になった提案があれば乾杯演出
      const nowConfirmed = new Set(
        s.proposals.filter((p) => p.status === "confirmed").map((p) => p.id)
      );
      if (confirmedIds.current) {
        for (const id of nowConfirmed) {
          if (!confirmedIds.current.has(id)) {
            setKanpai(true);
            break;
          }
        }
      }
      confirmedIds.current = nowConfirmed;
      setState(s);
    } catch {
      setLoadError(true);
    }
  }, [name]);

  useEffect(() => {
    registerServiceWorker();
    refresh();
    const timer = setInterval(refresh, 30000);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  useEffect(() => {
    setPushEnabled(
      typeof Notification !== "undefined" &&
        Notification.permission === "granted"
    );
  }, []);

  const withBusy = useCallback(
    async (fn: () => Promise<void>) => {
      setBusy(true);
      try {
        await fn();
        await refresh();
      } finally {
        setBusy(false);
      }
    },
    [refresh]
  );

  const handleAttend = useCallback(
    (id: number, join: boolean) =>
      withBusy(async () => {
        const res = await api.attend(id, name, join);
        if (join && res.status === "confirmed") setKanpai(true);
      }).catch(() => {}),
    [name, withBusy]
  );

  const handleToggleAvailability = useCallback(
    (date: string, slot: Slot, available: boolean) =>
      withBusy(() => api.setAvailability(name, date, slot, available).then(() => {})).catch(
        () => {}
      ),
    [name, withBusy]
  );

  const handleCreate = useCallback(
    async (p: { date: string; slot: Slot; minCount: number; title: string }) => {
      await withBusy(async () => {
        await api.createProposal({ name, ...p });
      });
    },
    [name, withBusy]
  );

  const handleSaveSettings = useCallback(
    async (n: number) => {
      await withBusy(() => api.saveSettings(n).then(() => {}));
    },
    [withBusy]
  );

  const handleEnablePush = useCallback(async () => {
    if (!state) return;
    const ok = await enablePush(name, state.vapidPublicKey);
    setPushEnabled(ok);
  }, [name, state]);

  if (!state) {
    return (
      <div className="gate">
        <span className="logo">🍻</span>
        <p className="sub">{loadError ? "接続エラー…再試行中" : "読み込み中…"}</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-title">
          <span className="beer">🍺</span> Nomikai
        </div>
        <button className="header-user" onClick={onLogout} title="名前を変える">
          👤 {name}
        </button>
      </header>

      <main className="tab-content">
        {tab === "home" && (
          <HomeTab
            state={state}
            busy={busy}
            onAttend={handleAttend}
            onEnablePush={handleEnablePush}
            pushEnabled={pushEnabled}
          />
        )}
        {tab === "calendar" && (
          <CalendarTab
            state={state}
            busy={busy}
            onToggle={handleToggleAvailability}
          />
        )}
        {tab === "proposals" && (
          <ProposalsTab
            state={state}
            busy={busy}
            onAttend={handleAttend}
            onCreate={handleCreate}
            onSaveSettings={handleSaveSettings}
          />
        )}
      </main>

      <nav className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab-btn${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            <span className="tab-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      {kanpai && <Kanpai onDone={() => setKanpai(false)} />}
    </div>
  );
}
