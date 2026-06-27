// 樂透抓牌分析 — 核心型別
// 免責：所有指標僅為「將玩家手算統計自動化」的輔助工具，樂透為獨立隨機事件，
// 歷史號碼不影響未來開獎機率，無法提高中獎率、不保證中獎，僅供參考娛樂。

export type GameId =
  | "daily539"
  | "lotto649"
  | "superLotto638"
  | "lotto1224"
  | "lotto3d"
  | "lotto4d";

export interface GameConfig {
  id: GameId;
  name: string; // 中文名
  /** 號碼池上界 (1..pool) */
  pool: number;
  /** 每期開出個數 (主區) */
  pick: number;
  /** 是否有特別號 (大樂透) */
  hasSpecial: boolean;
  /** 第二區設定 (威力彩第二區 1..secondPool 取 1) */
  second?: { pool: number; pick: number };
  /** 台彩 API endpoint 路徑 */
  apiPath: string;
  /** API 回傳內容的陣列鍵名 */
  resKey: string;
  /** 星彩類 (逐位 0-9 獨立)，pool/pick 不適用 */
  digitGame?: { digits: number };
}

/** 單期開獎 */
export interface Draw {
  /** 期別，如 "115000156" */
  period: string;
  /** 開獎日期 ISO，如 "2026-06-27" */
  date: string;
  /** 主區號碼，已由小到大排序 */
  numbers: number[];
  /** 開出順序 (未排序) */
  appear?: number[];
  /** 特別號 / 威力彩第二區 */
  special?: number;
}

/** 一個彩種的完整歷史，由舊到新 (index 越大越新) */
export type History = Draw[];
