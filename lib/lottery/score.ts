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

export const DEFAULT_WEIGHTS: ScoreWeights = {
  hot: 0.25,
  omission: 0.25,
  tail: 0.2,
  zone: 0.15,
  drag: 0.15,
};

function normalize(vals: number[]): number[] {
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  return vals.map((v) => (v - min) / span);
}

export function comboScore(
  history: History,
  g: GameConfig,
  opts: { window?: number; zoneSize?: number; weights?: ScoreWeights } = {}
): ScoreItem[] {
  const w = opts.window ?? 50;
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
  items.sort((a, b) => b.score - a.score);
  return items;
}
