import type { GameConfig, GameId } from "./types";

// 台彩官方 JSON API：https://api.taiwanlottery.com/TLCAPIWeB/Lottery/{apiPath}?month=YYYY-MM&pageSize=31
export const API_BASE = "https://api.taiwanlottery.com/TLCAPIWeB/Lottery";

export const GAMES: Record<GameId, GameConfig> = {
  daily539: {
    id: "daily539",
    name: "今彩539",
    pool: 39,
    pick: 5,
    hasSpecial: false,
    apiPath: "Daily539Result",
    resKey: "daily539Res",
  },
  lotto649: {
    id: "lotto649",
    name: "大樂透",
    pool: 49,
    pick: 6,
    hasSpecial: true,
    apiPath: "Lotto649Result",
    resKey: "lotto649Res",
  },
  superLotto638: {
    id: "superLotto638",
    name: "威力彩",
    pool: 38,
    pick: 6,
    hasSpecial: false,
    second: { pool: 8, pick: 1 },
    apiPath: "SuperLotto638Result",
    resKey: "superLotto638Res",
  },
  lotto1224: {
    id: "lotto1224",
    name: "雙贏彩",
    pool: 24,
    pick: 12,
    hasSpecial: false,
    apiPath: "Lotto1224Result",
    resKey: "lotto1224Res",
  },
  lotto3d: {
    id: "lotto3d",
    name: "3星彩",
    pool: 9,
    pick: 3,
    hasSpecial: false,
    apiPath: "3DHistoryResult",
    resKey: "lotto3DRes",
    digitGame: { digits: 3 },
  },
  lotto4d: {
    id: "lotto4d",
    name: "4星彩",
    pool: 9,
    pick: 4,
    hasSpecial: false,
    apiPath: "4DHistoryResult",
    resKey: "lotto4DRes",
    digitGame: { digits: 4 },
  },
};

export const GAME_LIST = Object.values(GAMES);

export function getGame(id: GameId): GameConfig {
  return GAMES[id];
}
