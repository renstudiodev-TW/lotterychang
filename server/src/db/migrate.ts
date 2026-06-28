// 建表 + 種子方案資料。可重複執行 (IF NOT EXISTS)。
import { getDb, schemaSql } from "./index.js";
import { PLAN_SEED } from "../plans.js";

export function migrate() {
  const db = getDb();
  db.exec(schemaSql());

  // 種子訂閱方案 (upsert)
  for (const p of PLAN_SEED) {
    db.run(
      `INSERT INTO plans (tier, name, price_twd, features, sort_order, active)
       VALUES (?, ?, ?, ?, ?, 1)
       ON CONFLICT(tier) DO UPDATE SET name=excluded.name, price_twd=excluded.price_twd,
         features=excluded.features, sort_order=excluded.sort_order`,
      [p.tier, p.name, p.priceTwd, JSON.stringify(p.features), p.sortOrder]
    );
  }
  console.log("migrate: schema 建立完成，方案已種子化");
}

// 直接執行
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("migrate.ts")) {
  migrate();
}
