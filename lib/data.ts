// 建置期 (server) 讀取公開遮罩版 JSON。前端只碰得到這份，碰不到完整分析。
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { PublicBundle } from "./lottery/publicize";

const DATA_DIR = path.join(process.cwd(), "public", "data");

export const SHIPPING_GAMES = ["daily539", "lotto649", "superLotto638"] as const;
export type ShippingGame = (typeof SHIPPING_GAMES)[number];

export async function loadGame(game: string): Promise<PublicBundle> {
  const raw = await readFile(path.join(DATA_DIR, `${game}.json`), "utf8");
  return JSON.parse(raw) as PublicBundle;
}

export interface GameIndexEntry {
  game: string;
  name: string;
  totalDraws: number;
  latest: string | null;
}

export async function loadIndex(): Promise<{ games: GameIndexEntry[]; generatedAt: string }> {
  const raw = await readFile(path.join(DATA_DIR, "index.json"), "utf8");
  return JSON.parse(raw);
}
