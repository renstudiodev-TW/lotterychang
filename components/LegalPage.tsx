import Link from "next/link";
import type { ReactNode } from "react";

// 法律/政策頁共用版型（服務條款、退費政策、隱私權）。
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <Link href="/" className="text-sm text-[var(--neon)] hover:underline">
        ← 回首頁
      </Link>
      <h1 className="mt-4 font-display text-3xl font-extrabold text-gradient sm:text-4xl">{title}</h1>
      <p className="mt-2 text-[13px] text-[var(--muted)]">最後更新：{updated}</p>
      <div className="mt-8 space-y-7">{children}</div>
    </div>
  );
}

export function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-lg font-bold text-[var(--neon)]">{heading}</h2>
      <div className="mt-2 space-y-2 text-[15px] leading-relaxed text-[var(--muted)]">{children}</div>
    </section>
  );
}

// 營業人資訊（合規揭露用，多頁共用）。
export const COMPANY = {
  name: "仁格數位科技工坊",
  taxId: "61138241",
  owner: "張博仁",
  address: "高雄市前鎮區武德街153巷17號",
  phone: "0976-858-794",
  email: "ren.studio.dev@gmail.com",
};
