import type { ReactNode } from "react";

export function Section({
  title,
  subtitle,
  tag,
  locked,
  children,
}: {
  title: string;
  subtitle?: string;
  tag?: string;
  locked?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="glass p-5 sm:p-6">
      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-lg font-bold text-[var(--text)]">{title}</h2>
          {tag && <span className="tag">{tag}</span>}
          {locked && <span className="tag border-[rgba(255,42,95,0.4)] text-[var(--hot)]">🔒 付費</span>}
          {!locked && <span className="tag border-[rgba(0,255,135,0.35)] text-[var(--cold)]">免費</span>}
        </div>
        {subtitle && <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}
