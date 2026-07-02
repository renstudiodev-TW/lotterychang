// AI 綜合評分：透明的加權統計 ensemble。
// ⚠️ 這不是預測模型。樂透每期為獨立隨機事件，本評分只是把多個玩家常用指標
//    (熱度、遺漏回補、尾數、區間、拖牌) 正規化後加權整合成單一分數，方便比較，
//    無法提高中獎率、不保證中獎，僅供參考娛樂。

import type { GameConfig, History } from "./types";
import { hotCold, omission, tailDistribution, zoneStats, coOccurrence } from "./indicators";
import { tailOf, zoneOf } from "./util";

export interface ScoreItem {
  n: number;
  score: number; // 0-100
  parts: {
    hot: number;
    omission: number;
    tail: number;
    zone: number;
    drag: number;
  };
}

export interface ScoreWeights {
  hot: number;
  omission: number;
  tail: number;
  zone: number;
  drag: number;
}

// 權重與視窗經回測調校（scripts/sweep-recency.ts）：目標連日重疊 ~2（每天換 3-4 個號，
// 保留 2-3 個強號延續）。避免舊版太黏（重疊 ~3-5）或重手版太亂（重疊 ~0.5）。
export const DEFAULT_WEIGHTS: ScoreWeights = {
  hot: 0.235,
  omission: 0.235,
  tail: 0.188,
  zone: 0.142,
  drag: 0.2,
};

// 評分視窗：熱度/尾數/區間的滾動期數。縮短 → 新開獎影響變大 → 每日精選更靈敏。
export const SCORE_WINDOW = 40;

// 近日去重：對「最近幾期已發布的精選號」做衰減式軟扣分，強制每日輪替，
// 但真正拉開差距的強號扣完仍在（不硬排除，top-N 永遠填得滿）。
export const RECENCY_DECAY = [1.0, 0.6, 0.3]; // 昨 / 前 / 大前
export const RECENCY_STRENGTH = 6; // 0-100 分制下每一「衰減單位」的扣分

// 強制輪替：同一號最多連席幾期，達上限就輪休一期（軟扣分之上的硬保證，
// 避免真正強的號一直霸榜；輪休後連席歸零，隔期可再回來）。
export const MAX_CONSEC_STREAK = 3;

/** 算出本期該「輪休」的號：在最近 cap 期已發布精選中連續出現達 cap 次者。 */
export function restingNumbers(recentPicksNewestFirst: number[][], cap = MAX_CONSEC_STREAK): Set<number> {
  const rest = new Set<number>();
  if (recentPicksNewestFirst.length < cap) return rest;
  for (const n of recentPicksNewestFirst[0] ?? []) {
    let streak = 0;
    for (const picks of recentPicksNewestFirst) {
      if (picks.includes(n)) streak++;
      else break;
    }
    if (streak >= cap) rest.add(n);
  }
  return rest;
}

/** 把輪休號移到排序末端，確保 top-pick 不含它們（硬保證輪替）。 */
export function applyRestCap(items: ScoreItem[], rest: Set<number>): ScoreItem[] {
  if (!rest.size) return items;
  const allowed = items.filter((it) => !rest.has(it.n));
  const rested = items.filter((it) => rest.has(it.n));
  return [...allowed, ...rested];
}

function normalize(vals: number[]): number[] {
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  return vals.map((v) => (v - min) / span);
}

export function comboScore(
  history: History,
  g: GameConfig,
  opts: {
    window?: number;
    zoneSize?: number;
    weights?: ScoreWeights;
    /** 最近幾期「已發布的精選號」，最新在前。用於近日去重軟扣分。 */
    recentPicks?: number[][];
  } = {}
): ScoreItem[] {
  const w = opts.window ?? SCORE_WINDOW;
  const zoneSize = opts.zoneSize ?? 10;
  const weights = opts.weights ?? DEFAULT_WEIGHTS;

  const hc = hotCold(history, g, w);
  const om = omission(history, g);
  const tails = tailDistribution(history, g, w);
  const zones = zoneStats(history, g, zoneSize, w);
  const co = coOccurrence(history, g);
  const last = history[history.length - 1]?.numbers ?? [];

  const tailRate = new Map(tails.map((t) => [t.tail, t.rate]));
  const zoneRate = new Map(zones.map((z) => [z.zone, z.rate]));

  // 各分量原始值 (index 0 = number 1)
  const hotRaw: number[] = [];
  const omRaw: number[] = [];
  const tailRaw: number[] = [];
  const zoneRaw: number[] = [];
  const dragRaw: number[] = [];

  for (let n = 1; n <= g.pool; n++) {
    hotRaw.push(hc[n - 1].z);
    // 遺漏回補：ratio 越大代表越久沒開、越「該回補」(玩家視角)，但 cap 避免極端
    omRaw.push(Math.min(om[n - 1].ratio, 3));
    tailRaw.push(tailRate.get(tailOf(n)) ?? 0);
    zoneRaw.push(zoneRate.get(zoneOf(n, zoneSize)) ?? 0);
    // 拖牌：上一期號碼對 n 的共現強度加總
    let drag = 0;
    for (const a of last) drag += co[a]?.[n] ?? 0;
    dragRaw.push(drag);
  }

  const hotN = normalize(hotRaw);
  const omN = normalize(omRaw);
  const tailN = normalize(tailRaw);
  const zoneN = normalize(zoneRaw);
  const dragN = normalize(dragRaw);

  const items: ScoreItem[] = [];
  for (let i = 0; i < g.pool; i++) {
    const parts = {
      hot: +(hotN[i] * 100).toFixed(1),
      omission: +(omN[i] * 100).toFixed(1),
      tail: +(tailN[i] * 100).toFixed(1),
      zone: +(zoneN[i] * 100).toFixed(1),
      drag: +(dragN[i] * 100).toFixed(1),
    };
    const score =
      weights.hot * hotN[i] +
      weights.omission * omN[i] +
      weights.tail * tailN[i] +
      weights.zone * zoneN[i] +
      weights.drag * dragN[i];
    items.push({ n: i + 1, score: +(score * 100).toFixed(1), parts });
  }

  // 近日去重：對最近 RECENCY_DECAY.length 期已發布的精選號做衰減式軟扣分。
  const recent = opts.recentPicks;
  if (recent && recent.length) {
    const penalty = new Map<number, number>();
    recent.slice(0, RECENCY_DECAY.length).forEach((picks, idx) => {
      const decay = RECENCY_DECAY[idx] ?? 0;
      for (const n of picks) penalty.set(n, (penalty.get(n) ?? 0) + decay);
    });
    for (const it of items) {
      const p = penalty.get(it.n);
      if (p) it.score = +Math.max(0, it.score - RECENCY_STRENGTH * p).toFixed(1);
    }
  }

  items.sort((a, b) => b.score - a.score);
  return items;
}
