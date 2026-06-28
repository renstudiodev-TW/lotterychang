// Cloudflare Workers 入口骨架 (正式環境)。
//
// ⚠️ 尚未完整接線：目前 repos 透過模組級 getDb() (node:sqlite) 取得 DB，
//    在 Workers 上要改成「每個 request 從 env.DB (D1 binding) 注入」。
//    遷移時的步驟：
//    1. 把 repos 改成接收 Db 參數 (或用 AsyncLocalStorage 注入 per-request)。
//    2. 下方 D1Db 實作 Db 介面 (D1 的 API 是 async，repos 需配合改 async)。
//    3. wrangler.toml 綁定 D1、設定 Cron Trigger 呼叫 runDailyReport。
//
// 本檔先放可編譯的 D1 adapter 範例與 fetch/scheduled 入口，待遷移時啟用。

import type { Db } from "./db/index.js";

interface D1Result<T> { results: T[] }
interface D1PreparedStatement {
  bind(...vals: unknown[]): D1PreparedStatement;
  all<T>(): Promise<D1Result<T>>;
  first<T>(): Promise<T | null>;
  run(): Promise<unknown>;
}
interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  exec(sql: string): Promise<unknown>;
}
export interface Env {
  DB: D1Database;
  ADMIN_USER: string;
  ADMIN_PASSWORD: string;
  SESSION_SECRET: string;
  LINE_CHANNEL_ID?: string;
  LINE_CHANNEL_SECRET?: string;
  LINE_MESSAGING_TOKEN?: string;
  ECPAY_MERCHANT_ID?: string;
  ECPAY_HASH_KEY?: string;
  ECPAY_HASH_IV?: string;
}

/** D1 版 Db adapter (async 版本，遷移 repos 為 async 後即可使用) */
export class D1Db {
  constructor(private d1: D1Database) {}
  async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return (await this.d1.prepare(sql).bind(...params).all<T>()).results;
  }
  async get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    return (await this.d1.prepare(sql).bind(...params).first<T>()) ?? undefined;
  }
  async run(sql: string, params: unknown[] = []): Promise<void> {
    await this.d1.prepare(sql).bind(...params).run();
  }
  async exec(sql: string): Promise<void> {
    await this.d1.exec(sql);
  }
}

export default {
  async fetch(_req: Request, _env: Env): Promise<Response> {
    return new Response("牌靈 AI worker — 待遷移 (見檔頭註解)。本地請用 npm run dev。", {
      status: 501,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  },
  // Cloudflare Cron Trigger → 每日報牌
  async scheduled(_event: unknown, _env: Env): Promise<void> {
    // 遷移後：const db = new D1Db(env.DB); await runDailyReport(db, "daily539");
    void (null as unknown as Db);
  },
};
