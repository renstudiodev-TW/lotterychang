import type { HotColdItem } from "@/lib/lottery/indicators";

/** 號碼盤熱力圖：每個號碼依 z-score 上色 (紅熱 / 綠冷 / 暗中性) */
export function HotColdGrid({ data }: { data: HotColdItem[] }) {
  return (
    <div className="grid grid-cols-7 gap-2 sm:grid-cols-10">
      {data.map((d) => {
        const z = d.z;
        let style: React.CSSProperties;
        if (z > 0) {
          const a = Math.min(z / 2.5, 1);
          style = { background: `rgba(255,42,95,${0.18 + a * 0.7})`, color: a > 0.4 ? "#fff" : "var(--text)" };
        } else if (z < 0) {
          const a = Math.min(-z / 2.5, 1);
          style = { background: `rgba(0,255,135,${0.15 + a * 0.6})`, color: a > 0.4 ? "#04221a" : "var(--text)" };
        } else {
          style = { background: "var(--surface-2)", color: "var(--muted)" };
        }
        return (
          <div
            key={d.n}
            className="flex flex-col items-center justify-center rounded-lg border border-[var(--border)] py-2"
            style={style}
            title={`${d.n} 號：近期出現 ${d.freq} 次，z=${d.z}`}
          >
            <span className="num text-base font-bold">{String(d.n).padStart(2, "0")}</span>
            <span className="num text-[10px] opacity-80">{d.freq}</span>
          </div>
        );
      })}
    </div>
  );
}
