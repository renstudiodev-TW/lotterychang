// 連號型態統計。用近期開獎號碼算「相鄰差 1」的連號對數分佈。
// 科學依據：隨機抽樣出現連號的機率其實很高，破除「號碼一定要分散」的直覺謬誤。

interface Draw {
  numbers: number[];
}

function consecPairs(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  let c = 0;
  for (let i = 1; i < s.length; i++) if (s[i] - s[i - 1] === 1) c++;
  return c;
}

export function ConsecutiveStats({ recent }: { recent: Draw[] }) {
  if (recent.length < 3) return <p className="text-sm text-[var(--muted)]">資料不足。</p>;
  const counts = recent.map((d) => consecPairs(d.numbers));
  const n = recent.length;
  const withAny = counts.filter((c) => c > 0).length;
  const pct = Math.round((withAny / n) * 100);

  // 分佈：0 組 / 1 組 / 2 組以上
  const buckets = [
    { label: "無連號", n: counts.filter((c) => c === 0).length },
    { label: "1 組連號", n: counts.filter((c) => c === 1).length },
    { label: "2 組以上", n: counts.filter((c) => c >= 2).length },
  ];
  const max = Math.max(1, ...buckets.map((b) => b.n));

  return (
    <div>
      <div className="mb-4 flex items-baseline gap-2">
        <span className="num text-3xl font-bold text-[var(--neon)]">{pct}%</span>
        <span className="text-sm text-[var(--muted)]">近 {n} 期有出現連號</span>
      </div>
      <div className="space-y-2">
        {buckets.map((b) => (
          <div key={b.label} className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-[13px] text-[var(--muted)]">{b.label}</span>
            <div className="h-4 flex-1 overflow-hidden rounded bg-[var(--surface-2)]">
              <div
                className="h-full rounded bg-[linear-gradient(90deg,var(--neon),var(--primary))]"
                style={{ width: `${(b.n / max) * 100}%` }}
              />
            </div>
            <span className="num w-8 shrink-0 text-right text-[13px] text-[var(--text)]">{b.n}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-[var(--muted)]">
        連號比你想的常見：隨機開獎下出現連號的機率其實偏高，「號碼一定要分散」是直覺謬誤。僅供參考。
      </p>
    </div>
  );
}
