// 從台彩官方 JSON API 抓歷史開獎，正規化成 Draw[]。
// API：https://api.taiwanlottery.com/TLCAPIWeB/Lottery/{apiPath}?month=YYYY-MM&pageSize=31

import type { Draw, GameConfig } from "./types";
import { API_BASE } from "./games";

interface RawRecord {
  period: number | string;
  lotteryDate?: string;
  drawNumberSize?: number[];
  drawNumberAppear?: number[];
  // 大樂透/威力彩第一區、特別號等可能欄位 (容錯)
  [k: string]: unknown;
}

function toDateStr(iso?: string): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

/** 把單筆 API 紀錄正規化成 Draw */
export function normalizeRecord(raw: RawRecord, g: GameConfig): Draw | null {
  const period = String(raw.period ?? "");
  const date = toDateStr(raw.lotteryDate);

  // 主區號碼：優先 drawNumberSize (已排序)
  let numbers = (raw.drawNumberSize as number[] | undefined) ?? [];
  const appear = raw.drawNumberAppear as number[] | undefined;

  let special: number | undefined;

  if (g.id === "lotto649") {
    // 大樂透：drawNumberSize 含 6 主號 + 特別號可能在最後或獨立欄位
    const sp = (raw.lotto649SpecialNumber ?? raw.specialNumber) as number | undefined;
    if (typeof sp === "number") special = sp;
    if (numbers.length === g.pick + 1 && special === undefined) {
      special = numbers[numbers.length - 1];
      numbers = numbers.slice(0, g.pick);
    }
  } else if (g.id === "superLotto638") {
    // 威力彩：第一區 6 號 + 第二區 1 號
    const sp = (raw.superLotto638SecondArea ?? raw.secondAreaNumber) as number | undefined;
    if (typeof sp === "number") special = sp;
    if (numbers.length === g.pick + 1 && special === undefined) {
      special = numbers[numbers.length - 1];
      numbers = numbers.slice(0, g.pick);
    }
  }

  if (!period || numbers.length === 0) return null;
  numbers = [...numbers].sort((a, b) => a - b);
  return { period, date, numbers, appear, special };
}

async function fetchMonth(g: GameConfig, year: number, month: number): Promise<Draw[]> {
  const mm = String(month).padStart(2, "0");
  const url = `${API_BASE}/${g.apiPath}?month=${year}-${mm}&pageSize=50`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const json = (await res.json()) as { rtCode: number; content?: Record<string, unknown> };
  if (json.rtCode !== 0 || !json.content) return [];
  const arr = (json.content[g.resKey] as RawRecord[] | undefined) ?? [];
  return arr.map((r) => normalizeRecord(r, g)).filter((d): d is Draw => d !== null);
}

/** 抓指定起始年月到迄止年月的所有開獎，回傳由舊到新排序 */
export async function fetchHistory(
  g: GameConfig,
  from: { year: number; month: number },
  to: { year: number; month: number },
  opts: { delayMs?: number; onProgress?: (msg: string) => void } = {}
): Promise<Draw[]> {
  const delay = opts.delayMs ?? 150;
  const all: Draw[] = [];
  let y = from.year;
  let m = from.month;
  while (y < to.year || (y === to.year && m <= to.month)) {
    try {
      const draws = await fetchMonth(g, y, m);
      all.push(...draws);
      opts.onProgress?.(`${g.name} ${y}-${String(m).padStart(2, "0")}: ${draws.length} 期`);
    } catch (e) {
      opts.onProgress?.(`${g.name} ${y}-${String(m).padStart(2, "0")}: 失敗 ${(e as Error).message}`);
    }
    m++;
    if (m > 12) { m = 1; y++; }
    if (delay) await new Promise((r) => setTimeout(r, delay));
  }
  // 去重 (依 period) 並由舊到新排序
  const seen = new Map<string, Draw>();
  for (const d of all) seen.set(d.period, d);
  return [...seen.values()].sort((a, b) => a.period.localeCompare(b.period));
}
