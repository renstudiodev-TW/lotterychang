// 掃參數：找「連日重疊」的甜蜜點（目標約 1.5-2.5，有延續也有新鮮感）。
// 用法：npx tsx scripts/sweep-recency.ts [--days N]
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GAMES } from "../lib/lottery/games";
import { comboScore, type ScoreWeights } from "../lib/lottery/score";
import type { Draw, GameId } from "../lib/lottery/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const LOOKBACK = 3;
const DECAY = [1.0, 0.6, 0.3];

const loadRaw = (game: GameId): Draw[] =>
  JSON.parse(readFileSync(path.join(ROOT, "data", "raw", `${game}.json`), "utf8")) as Draw[];
const overlap = (a: number[], b: number[]) => a.filter((n) => b.includes(n)).length;

// 拖牌權重 drag，其餘四項維持舊比例 (0.25:0.25:0.2:0.15) 縮放到 1-drag。
function weightsFor(drag: number): ScoreWeights {
  const rest = 1 - drag;
  const base = { hot: 0.25, omission: 0.25, tail: 0.2, zone: 0.15 };
  const sum = base.hot + base.omission + base.tail + base.zone;
  return {
    hot: base.hot / sum * rest,
    omission: base.omission / sum * rest,
    tail: base.tail / sum * rest,
    zone: base.zone / sum * rest,
    drag,
  };
}

interface Config { label: string; window: number; drag: number; strength: number }
const CONFIGS: Config[] = [
  { label: "舊(50/.15/0去重)", window: 50, drag: 0.15, strength: 0 },
  { label: "50/.15/str6", window: 50, drag: 0.15, strength: 6 },
  { label: "50/.15/str10", window: 50, drag: 0.15, strength: 10 },
  { label: "40/.20/str6", window: 40, drag: 0.20, strength: 6 },
  { label: "40/.20/str8", window: 40, drag: 0.20, strength: 8 },
  { label: "30/.25/str6", window: 30, drag: 0.25, strength: 6 },
  { label: "30/.25/str12", window: 30, drag: 0.25, strength: 12 },
];

function avgOverlap(hist: Draw[], g: GameId, cfg: Config, days: number): number {
  const G = GAMES[g];
  const end = hist.length - 1;
  const start = end - days - LOOKBACK;
  const w = weightsFor(cfg.drag);
  const picks: number[][] = [];
  for (let t = start; t <= end; t++) {
    const upto = hist.slice(0, t + 1);
    // 取「未去重」原始分數，再用本 config 的 strength 自行套扣分（掃參數用）。
    const items = comboScore(upto, G, { window: cfg.window, weights: w }).map((it) => ({ n: it.n, score: it.score }));
    const recent = picks.slice(-LOOKBACK).reverse();
    if (cfg.strength > 0 && recent.length) {
      const pen = new Map<number, number>();
      recent.forEach((p, i) => { for (const n of p) pen.set(n, (pen.get(n) ?? 0) + (DECAY[i] ?? 0)); });
      for (const it of items) { const p = pen.get(it.n); if (p) it.score = Math.max(0, it.score - cfg.strength * p); }
      items.sort((a, b) => b.score - a.score);
    }
    picks.push(items.slice(0, G.pick).map((s) => s.n));
  }
  const ov: number[] = [];
  for (let i = LOOKBACK + 1; i < picks.length; i++) ov.push(overlap(picks[i], picks[i - 1]));
  return ov.reduce((s, x) => s + x, 0) / ov.length;
}

const argv = process.argv.slice(2);
const di = argv.indexOf("--days");
const days = di >= 0 ? Number(argv[di + 1]) : 20;
const games: GameId[] = ["daily539", "lotto649", "superLotto638"];

console.log(`連日重疊平均（回測 ${days} 期）。目標區間約 1.5-2.5。\n`);
const header = "config".padEnd(18) + games.map((g) => GAMES[g].name.padStart(10)).join("");
console.log(header);
for (const cfg of CONFIGS) {
  const row = cfg.label.padEnd(18) + games.map((g) => avgOverlap(loadRaw(g), g, cfg, days).toFixed(2).padStart(10)).join("");
  console.log(row);
}
