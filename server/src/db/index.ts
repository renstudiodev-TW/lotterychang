// DB 抽象層：本地用 node:sqlite，正式環境(Cloudflare)改用 D1 adapter (見 worker.ts)。
// SQLite SQL 兩者通用，只有執行 API 不同，所以 repository 層只依賴這個介面。

import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface Db {
  all<T = Record<string, unknown>>(sql: string, params?: unknown[]): T[];
  get<T = Record<string, unknown>>(sql: string, params?: unknown[]): T | undefined;
  run(sql: string, params?: unknown[]): void;
  exec(sql: string): void;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.resolve(__dirname, "..", "..");

class NodeSqliteDb implements Db {
  private db: DatabaseSync;
  constructor(file: string) {
    if (file !== ":memory:") mkdirSync(path.dirname(file), { recursive: true });
    this.db = new DatabaseSync(file);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  }
  all<T>(sql: string, params: unknown[] = []): T[] {
    return this.db.prepare(sql).all(...(params as never[])) as T[];
  }
  get<T>(sql: string, params: unknown[] = []): T | undefined {
    return this.db.prepare(sql).get(...(params as never[])) as T | undefined;
  }
  run(sql: string, params: unknown[] = []): void {
    this.db.prepare(sql).run(...(params as never[]));
  }
  exec(sql: string): void {
    this.db.exec(sql);
  }
}

let _db: Db | null = null;

export function getDb(): Db {
  if (_db) return _db;
  const file = process.env.DB_PATH || path.join(SERVER_ROOT, "data", "app.db");
  _db = new NodeSqliteDb(file);
  return _db;
}

export function schemaSql(): string {
  return readFileSync(path.join(__dirname, "schema.sql"), "utf8");
}
