-- 金流訂單：建立委託時寫入 pending，藍新幕後通知(Notify)回來時對應回會員並開通訂閱。
CREATE TABLE IF NOT EXISTS orders (
  mer_order_no  TEXT PRIMARY KEY,               -- 送藍新的 MerOrderNo（唯一）
  user_id       TEXT NOT NULL REFERENCES users(id),
  tier          TEXT NOT NULL,                  -- pro | max
  amount        INTEGER NOT NULL,               -- 每期金額
  status        TEXT NOT NULL DEFAULT 'pending',-- pending | paid | failed
  period_no     TEXT,                           -- 藍新委託單號 PeriodNo
  trade_no      TEXT,                           -- 藍新交易序號
  raw           TEXT,                           -- 通知原文（除錯）
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
