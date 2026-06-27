// 共用工具函式

/** 組合數 C(n, r) */
export function combination(n: number, r: number): number {
  if (r < 0 || r > n) return 0;
  r = Math.min(r, n - r);
  let result = 1;
  for (let i = 0; i < r; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return Math.round(result);
}

/** 尾數 (個位) */
export function tailOf(n: number): number {
  return n % 10;
}

/** 區間 index：zone(n) = floor((n-1)/size) */
export function zoneOf(n: number, size: number): number {
  return Math.floor((n - 1) / size);
}

/** 是否質數 (1 不算質數) */
export function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) return false;
  }
  return true;
}

/** 號碼總和 */
export function sum(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0);
}

/** 平均 */
export function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return sum(arr) / arr.length;
}

/** AC 值 = (兩兩正差值去重個數) - (K - 1)，越大越離散 */
export function acValue(nums: number[]): number {
  const diffs = new Set<number>();
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      diffs.add(Math.abs(nums[i] - nums[j]));
    }
  }
  return diffs.size - (nums.length - 1);
}

/** 最長連續號長度 (如 17,18,19 → 3) */
export function maxRun(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  let best = 1;
  let cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      cur++;
      best = Math.max(best, cur);
    } else {
      cur = 1;
    }
  }
  return sorted.length === 0 ? 0 : best;
}

/** 12 生肖固定順序 */
export const ZODIAC = [
  "鼠", "牛", "虎", "兔", "龍", "蛇",
  "馬", "羊", "猴", "雞", "狗", "豬",
] as const;

export const ZODIAC_EMOJI: Record<string, string> = {
  鼠: "🐭", 牛: "🐮", 虎: "🐯", 兔: "🐰", 龍: "🐲", 蛇: "🐍",
  馬: "🐴", 羊: "🐑", 猴: "🐵", 雞: "🐔", 狗: "🐶", 豬: "🐷",
};

/** 西元年 → 當年生肖 index (西元4年=鼠) */
export function yearZodiacIndex(year: number): number {
  return ((year - 4) % 12 + 12) % 12;
}

/**
 * 號碼對應生肖：號碼池最大號對應當年生肖，遞減依序往後排。
 * zodiac(n) = ZODIAC[(Y + (pool - n) % 12) % 12]
 */
export function zodiacOf(n: number, pool: number, year: number): string {
  const Y = yearZodiacIndex(year);
  const offset = (pool - n) % 12;
  return ZODIAC[(Y + offset) % 12];
}
