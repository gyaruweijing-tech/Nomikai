"use client";

import { useEffect, useMemo } from "react";

// 開催確定時の乾杯オーバーレイ＋紙吹雪
export default function Kanpai({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [onDone]);

  const pieces = useMemo(() => {
    const colors = ["#f59e0b", "#fbbf24", "#16a34a", "#38bdf8", "#f472b6", "#fde047"];
    return Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      duration: 1.6 + Math.random() * 1.4,
      color: colors[i % colors.length],
      scale: 0.6 + Math.random() * 0.9,
    }));
  }, []);

  return (
    <>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}vw`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `scale(${p.scale})`,
          }}
        />
      ))}
      <div className="kanpai-overlay" onClick={onDone}>
        <div className="glasses">🍻</div>
        <div className="msg">開催決定！！</div>
        <div className="sub">みんなで乾杯だ〜〜〜</div>
      </div>
    </>
  );
}
