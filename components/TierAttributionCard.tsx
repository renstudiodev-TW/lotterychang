// 獎項階梯回推：已知這期開獎，回推各抓法×參數能打到哪一級獎項，從頭獎往下排。
// 誠實框架：事後回推（已知開獎才反推），非預測、非保證中獎。

const pad = (n: number) => String(n).padStart(2, "0");

interface TierCombo { method: string; label: string; window: number; mainHits: number }
interface TierRow { key: string; label: string; cond: string; reached: boolean; combos: TierCombo[] }
interface TierAttribution {
  period: string;
  date: string;
  actual: number[];
  special: number | null;
  pick: number;
  specialLabel: string | null;
  specialPredicted: number | null;
  specialMethod: string | null;
  specialHit: boolean;
  windows: number[];
  tiers: TierRow[];
  bestTierKey: string | null;
}

function comboText(c: TierCombo) {
  return c.window > 0 ? `${c.label}·近${c.window}期` : c.label;
}

export function TierAttributionCard({ data }: { data: TierAttribution | null }) {
  if (!data) return null;

  return (
    <section className="mb-6 rounded-2xl border-2 border-[var(--primary)]/40 bg-[linear-gradient(160deg,rgba(139,92,246,0.08),rgba(18,24,36,0.92))] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-lg font-bold text-[var(--primary)]">🏆 各獎項回推 · 從頭獎往下</div>
        <span className="tag">事後驗證 · 第 {data.period} 期</span>
      </div>
      <p className="mt-1 text-[13px] text-[var(--muted)]">
        已知這期開獎後，把每個抓法跨不同參數視窗（{data.windows.join("／")} 期）全跑一遍，回推各組合能打到哪一級獎項。
      </p>

      {/* 這期開獎 */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[13px] text-[var(--muted)]">本期開獎：</span>
        {data.actual.map((n) => (
          <span key={n} className="num inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-2)] text-sm font-bold text-[var(--neon)] ring-1 ring-[rgba(0,240,255,0.3)]">
            {pad(n)}
          </span>
        ))}
        {data.special != null && (
          <>
            <span className="px-0.5 text-[var(--muted)]">＋</span>
            <span className="num inline-flex h-8 w-8 items-center justify-center rounded-full ball-special text-sm font-bold">{pad(data.special)}</span>
          </>
        )}
      </div>

      {/* 特別號/第二區回推 */}
      {data.specialLabel && (
        <div className="mt-3 text-[13px] text-[var(--muted)]">
          本期{data.specialLabel}回推（{data.specialMethod}）：
          {data.specialPredicted != null ? (
            <b className={data.specialHit ? "text-[#ffd24a]" : "text-[var(--text)]"}>
              {" "}{pad(data.specialPredicted)} {data.specialHit ? "✓ 命中" : "✗ 未中"}
            </b>
          ) : (
            " 無"
          )}
        </div>
      )}

      {/* 獎項階梯 */}
      <div className="mt-4 space-y-1.5">
        {data.tiers.map((t) => {
          const isBest = t.key === data.bestTierKey;
          return (
            <div
              key={t.key}
              className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2 ${
                isBest
                  ? "border-[#ffd24a]/60 bg-[rgba(255,210,74,0.1)]"
                  : t.reached
                    ? "border-[var(--border)] bg-[var(--surface-2)]/50"
                    : "border-[var(--border)] opacity-45"
              }`}
            >
              <span className={`w-14 shrink-0 font-bold ${isBest ? "text-[#ffd24a]" : t.reached ? "text-[var(--text)]" : "text-[var(--muted)]"}`}>
                {t.label}
              </span>
              <span className="w-28 shrink-0 text-[12px] text-[var(--muted)]">{t.cond}</span>
              <span className="flex flex-1 flex-wrap gap-1.5">
                {t.reached ? (
                  t.combos.map((c, i) => (
                    <span
                      key={i}
                      className={`rounded-full border px-2 py-0.5 text-[12px] ${
                        isBest ? "border-[#ffd24a]/50 bg-[rgba(255,210,74,0.12)] text-[#ffd24a]" : "border-[var(--border)] text-[var(--text)]"
                      }`}
                    >
                      {comboText(c)}
                    </span>
                  ))
                ) : (
                  <span className="text-[12px] text-[var(--muted)]">本期無組合達標</span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {data.bestTierKey == null && (
        <p className="mt-3 text-[13px] text-[var(--muted)]">本期沒有任何抓法×參數組合達到最低獎項門檻（這種期本來就難，很正常）。</p>
      )}

      <p className="mt-4 rounded-lg border border-[rgba(139,92,246,0.3)] bg-[rgba(139,92,246,0.06)] p-3 text-[12px] leading-relaxed text-[var(--muted)]">
        這是<b className="text-[var(--text)]">已知開獎後才回推</b>哪些工具能打到哪一級的「事後驗證」，<b className="text-[var(--text)]">不是預測、不代表下期</b>。
        {data.specialLabel ? `${data.specialLabel}為 best-effort 熱門回推，命中與否僅供參考。` : ""}
        每期最強的抓法與參數都會變，樂透為獨立隨機事件，無法提高中獎率、不保證中獎，僅供參考娛樂。
      </p>
    </section>
  );
}
