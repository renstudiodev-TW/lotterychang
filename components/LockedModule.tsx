import Link from "next/link";

/** 通用付費鎖定區塊 (拖牌版路、交叉選牌、自訂區間等 premium 功能的預覽鎖) */
export function LockedModule({
  title,
  desc,
  tier,
}: {
  title: string;
  desc: string;
  tier?: string;
}) {
  return (
    <section className="glass relative overflow-hidden p-5 sm:p-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="font-display text-lg font-bold text-[var(--text)]">{title}</h2>
        <span className="tag border-[rgba(255,42,95,0.4)] text-[var(--hot)]">🔒 {tier ?? "付費"}</span>
      </div>
      <p className="mb-4 text-sm text-[var(--muted)]">{desc}</p>
      <div className="scanline relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-6">
        <div className="pointer-events-none flex select-none flex-wrap gap-2 blur-[6px]">
          {Array.from({ length: 18 }).map((_, i) => (
            <span key={i} className="ball ball-special opacity-70">
              {String(((i * 7) % 39) + 1).padStart(2, "0")}
            </span>
          ))}
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[rgba(8,11,16,0.45)]">
          <span className="text-3xl">🔒</span>
          <Link href="/pricing" className="btn-primary">解鎖此功能</Link>
        </div>
      </div>
    </section>
  );
}
