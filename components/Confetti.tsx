"use client";

// 純 CSS 彩帶爆發。位置/顏色由 index 決定（非亂數）以避免 hydration 不一致。
// fireKey 改變時整組重新掛載重播；count 控制片數。

const COLORS = ["#ffd24a", "#ff2a5f", "#00f0ff", "#00ff87", "#8b5cf6", "#fff2b0"];

export function Confetti({ fireKey = 0, count = 28 }: { fireKey?: number; count?: number }) {
  if (!fireKey) return null;
  return (
    <div key={fireKey} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const left = ((i * 37) % 100); // 0-99% 均勻散開
        const delay = (i % 7) * 0.08;
        const dur = 1.3 + ((i % 5) * 0.14);
        const color = COLORS[i % COLORS.length];
        const rotate = (i * 47) % 360;
        return (
          <span
            key={i}
            className="confetti-piece"
            style={{
              left: `${left}%`,
              background: color,
              animationDelay: `${delay}s`,
              animationDuration: `${dur}s`,
              transform: `rotate(${rotate}deg)`,
            }}
          />
        );
      })}
    </div>
  );
}
