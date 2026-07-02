// 回測：比較「舊評分」與「新評分（縮窗+加重拖牌+近日去重）」的連日精選重疊度。
// 用法：npx tsx scripts/backtest-recency.ts [gameId ...] [--days N]
// 走訪歷史，逐期算出當期會發布的精選 top-pick，統計「與前一期重疊幾個」。

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GAMES } from "../lib/lottery/games";
import { comboScore, type ScoreWeights } from "../lib/lottery/score";
import type { Draw, GameId } from "../lib/lottery/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// 舊邏輯：視窗 50、拖牌僅 0.15、無去重。
const OLD_WINDOW = 50;
const OLD_WEIGHTS: ScoreWeights = { hot: 0.25, omission: 0.25, tail: 0.2, zone: 0.15, drag: 0.15 };
const RECENCY_LOOKBACK = 3;

function loadRaw(game: GameId): Draw[] {
  const f = path.join(ROOT, "data", "raw", `${game}.json`);
  return JSON.parse(readFileSync(f, "utf8")) as Draw[];
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const overlap = (a: number[], b: number[]) => a.filter((n) => b.includes(n)).length;

function run() {
  const argv = process.argv.slice(2);
  const daysIdx = argv.indexOf("--days");
  const days = daysIdx >= 0 ? Number(argv[daysIdx + 1]) : 15;
  const games = argv.filter((a) => a in GAMES) as GameId[];
  const targets: GameId[] = games.length ? games : ["daily539", "lotto649", "superLotto638"];

  for (const id of targets) {
    const g = GAMES[id];
    const hist = loadRaw(id);
    if (hist.length < OLD_WINDOW + days + RECENCY_LOOKBACK + 2) {
      console.log(`\n【${g.name}】資料不足，跳過`);
      continue;
    }

    // 走訪的起點：多暖機 RECENCY_LOOKBACK 期讓新邏輯的去重清單先填滿。
    const end = hist.length - 1;
    const start = end - days - RECENCY_LOOKBACK;

    const oldPicks: number[][] = [];
    const newPicks: number[][] = [];
    const rows: { period: string; old: number[]; neu: number[] }[] = [];

    for (let t = start; t <= end; t++) {
      const upto = hist.slice(0, t + 1); // 含第 t 期（開獎後重算，代表下一期要發布的精選）

      const oldPick = comboScore(upto, g, { window: OLD_WINDOW, weights: OLD_WEIGHTS })
        .slice(0, g.pick)
        .map((s) => s.n);

      const recentNew = newPicks.slice(-RECENCY_LOOKBACK).reverse();
      const newPick = comboScore(upto, g, { recentPicks: recentNew })
        .slice(0, g.pick)
        .map((s) => s.n);

      oldPicks.push(oldPick);
      newPicks.push(newPick);
      rows.push({ period: hist[t].period, old: oldPick, neu: newPick });
    }

    // 只統計「報告視窗」內的連日重疊（跳過暖機段）。
    const oldOv: number[] = [];
    const newOv: number[] = [];
    const report = rows.slice(RECENCY_LOOKBACK);
    const baseIdx = RECENCY_LOOKBACK;
    for (let i = 0; i < report.length; i++) {
      const gi = baseIdx + i;
      oldOv.push(overlap(oldPicks[gi], oldPicks[gi - 1]));
      newOv.push(overlap(newPicks[gi], newPicks[gi - 1]));
    }

    const avg = (a: number[]) => (a.reduce((s, x) => s + x, 0) / a.length).toFixed(2);
    const maxo = (a: number[]) => Math.max(...a);
    const cnt = (a: number[], th: number) => a.filter((x) => x >= th).length;

    console.log(`\n【${g.name}】pick ${g.pick}／pool ${g.pool}／回測 ${report.length} 期連日重疊`);
    console.log("期別        舊精選                     重疊   新精選                     重疊");
    for (let i = 0; i < report.length; i++) {
      const r = report[i];
      const o = r.old.map(pad2).join(" ");
      const n = r.neu.map(pad2).join(" ");
      console.log(`${r.period}  [${o}]  ${oldOv[i]}    [${n}]  ${newOv[i]}`);
    }
    console.log(
      `→ 平均連日重疊：舊 ${avg(oldOv)}／新 ${avg(newOv)}　｜　最大：舊 ${maxo(oldOv)}／新 ${maxo(newOv)}` +
        `　｜　重疊≥3 期數：舊 ${cnt(oldOv, 3)}／新 ${cnt(newOv, 3)}`
    );
  }
}

run();
