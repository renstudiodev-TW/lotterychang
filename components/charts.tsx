"use client";

import {
  Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
  Area, AreaChart, CartesianGrid,
} from "recharts";
import type {
  HotColdItem, OmissionItem, TailItem, ZoneItem, ZodiacItem,
} from "@/lib/lottery/indicators";

const HOT = "#ff2a5f";
const COLD = "#00ff87";
const NEON = "#00f0ff";
const PRIMARY = "#8b5cf6";
const MUTED = "#9ca3af";

const tooltipStyle = {
  background: "rgba(14,20,32,0.95)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "0.5rem",
  color: "#f3f4f6",
  fontSize: "12px",
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** 冷熱號長條圖 (近 W 期出現次數) */
export function HotColdChart({ data }: { data: HotColdItem[] }) {
  const rows = data.map((d) => ({ name: pad(d.n), freq: d.freq, tag: d.tag, expected: d.expected }));
  const expected = data[0]?.expected ?? 0;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 10 }} interval={1} />
        <YAxis tick={{ fill: MUTED, fontSize: 10 }} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} 次 (期望 ${expected})`, "出現"]} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar dataKey="freq" radius={[3, 3, 0, 0]}>
          {rows.map((r, i) => (
            <Cell key={i} fill={r.tag === "hot" ? HOT : r.tag === "cold" ? COLD : PRIMARY} fillOpacity={r.tag === "normal" ? 0.5 : 0.95} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** 遺漏值排行 (當前遺漏期數，前 15 名) */
export function OmissionChart({ data }: { data: OmissionItem[] }) {
  const rows = [...data].sort((a, b) => b.currentMiss - a.currentMiss).slice(0, 15)
    .map((d) => ({ name: pad(d.n), current: d.currentMiss, avg: d.avgMiss }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart layout="vertical" data={rows} margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
        <XAxis type="number" tick={{ fill: MUTED, fontSize: 10 }} />
        <YAxis type="category" dataKey="name" tick={{ fill: MUTED, fontSize: 11 }} width={28} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v, k) => [`${v} 期`, k === "current" ? "當前遺漏" : "平均遺漏"]} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar dataKey="current" radius={[0, 3, 3, 0]} fill={NEON} fillOpacity={0.9} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** 尾數分佈 (0-9) */
export function TailChart({ data }: { data: TailItem[] }) {
  const rows = data.map((d) => ({ name: `尾${d.tail}`, freq: d.freq, tag: d.tag }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 11 }} />
        <YAxis tick={{ fill: MUTED, fontSize: 10 }} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} 次`, "出現"]} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar dataKey="freq" radius={[3, 3, 0, 0]}>
          {rows.map((r, i) => (
            <Cell key={i} fill={r.tag === "hot" ? HOT : r.tag === "cold" ? COLD : PRIMARY} fillOpacity={r.tag === "normal" ? 0.5 : 0.95} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** 區間冷熱 */
export function ZoneChart({ data }: { data: ZoneItem[] }) {
  const rows = data.map((d) => ({ name: d.label, freq: d.freq }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 10 }} />
        <YAxis tick={{ fill: MUTED, fontSize: 10 }} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} 次`, "出現"]} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar dataKey="freq" radius={[3, 3, 0, 0]} fill={PRIMARY} fillOpacity={0.85} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** 生肖近期熱度 */
export function ZodiacChart({ data }: { data: ZodiacItem[] }) {
  const rows = data.map((d) => ({ name: d.zodiac, freq: d.freq }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 11 }} />
        <YAxis tick={{ fill: MUTED, fontSize: 10 }} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} 次`, "出現"]} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar dataKey="freq" radius={[3, 3, 0, 0]} fill={NEON} fillOpacity={0.8} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** 和值分佈直方圖 */
export function SumChart({ data }: { data: { bucket: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="sumFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={NEON} stopOpacity={0.5} />
            <stop offset="100%" stopColor={NEON} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="bucket" tick={{ fill: MUTED, fontSize: 9 }} />
        <YAxis tick={{ fill: MUTED, fontSize: 10 }} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} 期`, "和值落點"]} cursor={{ stroke: NEON }} />
        <Area type="monotone" dataKey="count" stroke={NEON} fill="url(#sumFill)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** AC 值分佈 */
export function ACChart({ data }: { data: { ac: number; count: number }[] }) {
  const rows = data.map((d) => ({ name: String(d.ac), count: d.count }));
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 10 }} />
        <YAxis tick={{ fill: MUTED, fontSize: 10 }} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} 期`, "AC 值"]} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar dataKey="count" radius={[3, 3, 0, 0]} fill={PRIMARY} fillOpacity={0.85} />
      </BarChart>
    </ResponsiveContainer>
  );
}
