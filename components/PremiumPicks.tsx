"use client";

import { useEffect, useState, type ReactNode } from "react";

interface Pick {
  n: number;
  score: number;
}

// 付費高分精選：已登入且 pro/max 會員 fetch 真號碼顯示；否則維持遮罩版（children=LockedPicks）。
export function PremiumPicks({
  game,
  gameName,
  children,
}: {
  game: string;
  gameName: string;
  children: ReactNode;
}) {
  const [state, setState] = useState<"loading" | "locked" | "unlocked">("loading");
  const [picks, setPicks] = useState<Pick[]>([]);

  useEffect(() => {
    fetch(`/api/me/picks?game=${game}`, { credentials: "same-origin" })
      .then(async (r) => {
        if (!r.ok) return setState("locked");
        const d = await r.json();
        setPicks(d.picks ?? []);
        setState("unlocked");
      })
      .catch(() => setState("locked"));
  }, [game]);

  if (state !== "unlocked") return <>{children}</>;

  return (
    <div className="glow-wrap glass relative overflow-hidden p-5 sm:p-6">
      <div className="mb-1 flex items-center gap-2">
        <span className="tag border-[rgba(0,255,135,0.4)] text-[var(--cold)]">🔓 已解鎖</span>
        <span className="tag">AI 綜合評分</span>
      </div>
      <h3 className="font-display text-lg font-bold text-[var(--text)]">
        本期 {gameName} AI 高評分精選 <span className="num text-[var(--cold)]">{picks.length}</span> 碼
      </h3>
      <p className="mt-1 mb-5 text-sm text-[var(--muted)]">
        多種抓牌技巧交叉演算後的最高分號碼（進階／旗艦會員專屬）。
      </p>
      <div className="flex flex-wrap items-start gap-4">
        {picks.map((p) => (
          <div key={p.n} className="flex flex-col items-center gap-1">
            <span className="num inline-flex h-12 w-12 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#6bffc0,var(--cold))] text-lg font-bold text-[#04221a] shadow-[0_0_12px_rgba(0,255,135,0.4)]">
              {String(p.n).padStart(2, "0")}
            </span>
            <span className="num text-[11px] text-[var(--muted)]">{p.score.toFixed(1)}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[11px] leading-relaxed text-[var(--muted)]">
        ※ 分數為相對綜合評分（0–100），僅供號碼間比較參考，<strong className="text-[var(--text)]">不是中獎機率</strong>。
      </p>
    </div>
  );
}
