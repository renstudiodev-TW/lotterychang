// 和值走勢圖（均值回歸 + 標準差帶）。伺服器端用既有 patterns 資料算，輸出靜態 SVG。
// 科學依據：依中央極限定理，每期號碼和值長期收斂於理論期望值；標準差帶顯示當前是否處於極端波動。

interface Pt {
  period: string;
  sum: number;
}

export function SumTrendChart({ patterns, expectedSum }: { patterns: Pt[]; expectedSum: number }) {
  const data = patterns.slice(-40); // 取近 40 期
  if (data.length < 5) return <p className="text-sm text-[var(--muted)]">資料不足。</p>;

  const sums = data.map((d) => d.sum);
  const mean = sums.reduce((a, b) => a + b, 0) / sums.length;
  const sd = Math.sqrt(sums.reduce((a, b) => a + (b - mean) ** 2, 0) / sums.length) || 1;
  const latest = sums[sums.length - 1];
  const z = (latest - mean) / sd;

  const W = 600;
  const H = 200;
  const padX = 8;
  const padY = 16;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;
  const lo = mean - 3 * sd;
  const hi = mean + 3 * sd;
  const x = (i: number) => padX + (i / (data.length - 1)) * innerW;
  const y = (v: number) => padY + (1 - (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * innerH;

  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.sum).toFixed(1)}`).join(" ");
  const band = (k: number) => ({ top: y(mean + k * sd), bot: y(mean - k * sd) });
  const b1 = band(1);
  const b2 = band(2);

  const verdict =
    Math.abs(z) < 0.8 ? "接近平均" : z > 0 ? `偏高 ${z.toFixed(1)}σ` : `偏低 ${Math.abs(z).toFixed(1)}σ`;
  const verdictColor = Math.abs(z) < 0.8 ? "var(--muted)" : Math.abs(z) >= 2 ? "var(--hot)" : "var(--neon)";

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" role="img" aria-label="和值走勢">
        {/* ±2σ / ±1σ 帶 */}
        <rect x={padX} y={b2.top} width={innerW} height={b2.bot - b2.top} fill="rgba(0,240,255,0.05)" />
        <rect x={padX} y={b1.top} width={innerW} height={b1.bot - b1.top} fill="rgba(0,240,255,0.09)" />
        {/* 平均線 */}
        <line x1={padX} y1={y(mean)} x2={W - padX} y2={y(mean)} stroke="rgba(139,92,246,0.8)" strokeDasharray="5 4" strokeWidth={1.5} />
        {/* 理論期望線 */}
        <line x1={padX} y1={y(expectedSum)} x2={W - padX} y2={y(expectedSum)} stroke="rgba(156,163,175,0.5)" strokeWidth={1} />
        {/* 和值折線 */}
        <path d={line} fill="none" stroke="var(--neon)" strokeWidth={2} />
        {/* 最新點 */}
        <circle cx={x(data.length - 1)} cy={y(latest)} r={4} fill="var(--hot)" />
      </svg>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[var(--muted)]">
        <span>本期和值 <b className="num text-[var(--text)]">{latest}</b></span>
        <span>近期均值 <b className="num text-[var(--text)]">{mean.toFixed(0)}</b></span>
        <span>理論期望 <b className="num text-[var(--text)]">{expectedSum}</b></span>
        <span style={{ color: verdictColor }}>目前 {verdict}</span>
      </div>
      <p className="mt-2 text-[11px] text-[var(--muted)]">
        紫虛線＝近期均值，灰線＝理論期望，藍帶＝±1σ／±2σ。和值落在帶外屬統計極端，僅供參考。
      </p>
    </div>
  );
}
