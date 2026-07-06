"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import App from "@/components/App";

const NAME_KEY = "nomikai:name";

// 名前だけで参加するゲート。localStorage に保存して次回から自動ログイン。
export default function Page() {
  const [name, setName] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    setName(localStorage.getItem(NAME_KEY));
    setReady(true);
  }, []);

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) {
      setError("名前を入力してね");
      return;
    }
    setJoining(true);
    setError("");
    try {
      const { member } = await api.join(trimmed);
      localStorage.setItem(NAME_KEY, member.name);
      setName(member.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "参加に失敗しました");
    } finally {
      setJoining(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(NAME_KEY);
    setName(null);
    setInput("");
  };

  if (!ready) return null;

  if (!name) {
    return (
      <div className="gate">
        <span className="logo">🍻</span>
        <h1>Nomikai</h1>
        <p className="sub">
          みんなの空きから、自動で飲み会が決まるアプリ
        </p>
        <form onSubmit={join}>
          <input
            type="text"
            placeholder="あなたの名前"
            maxLength={20}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
          />
          <button className="btn primary" type="submit" disabled={joining}>
            {joining ? "参加中…" : "🍺 参加する"}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  return <App name={name} onLogout={logout} />;
}
