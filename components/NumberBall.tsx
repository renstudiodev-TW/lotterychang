import { ZODIAC_EMOJI } from "@/lib/lottery/util";

type Tone = "hot" | "cold" | "normal" | "special";

export function NumberBall({
  n,
  tone = "normal",
  size = "md",
  sub,
}: {
  n: number | string;
  tone?: Tone;
  size?: "sm" | "md" | "lg";
  sub?: string;
}) {
  const toneClass =
    tone === "hot" ? "ball-hot" : tone === "cold" ? "ball-cold" : tone === "special" ? "ball-special" : "";
  const sizeStyle =
    size === "lg"
      ? { width: "3.25rem", height: "3.25rem", fontSize: "1.35rem" }
      : size === "sm"
        ? { width: "2rem", height: "2rem", fontSize: "0.85rem" }
        : undefined;
  return (
    <span className="inline-flex flex-col items-center gap-1">
      <span className={`ball ${toneClass}`} style={sizeStyle}>
        {typeof n === "number" ? String(n).padStart(2, "0") : n}
      </span>
      {sub && <span className="num text-[10px] text-[var(--muted)]">{sub}</span>}
    </span>
  );
}

export function ZodiacBadge({ zodiac }: { zodiac: string }) {
  return (
    <span className="tag">
      {ZODIAC_EMOJI[zodiac] ?? ""} {zodiac}
    </span>
  );
}
