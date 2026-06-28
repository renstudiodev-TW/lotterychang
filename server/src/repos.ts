// 資料存取層 (repositories)。SQL 為 SQLite 方言，node:sqlite 與 D1 通用。
import { getDb } from "./db/index.js";
import { uuid, nowIso } from "./util.js";
import type { Tier } from "./plans.js";

export interface User {
  id: string;
  line_user_id: string | null;
  display_name: string;
  picture_url: string | null;
  email: string | null;
  role: string;
  status: string;
  created_at: string;
  last_login_at: string | null;
}

export interface Subscription {
  id: string;
  user_id: string;
  tier: Tier;
  status: string;
  source: string;
  started_at: string;
  current_period_end: string | null;
  ecpay_merchant_member_id: string | null;
  ecpay_gwsr: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemberRow extends User {
  tier: Tier | null;
  sub_status: string | null;
  current_period_end: string | null;
}

// ---- Users ----
export const usersRepo = {
  byId(id: string): User | undefined {
    return getDb().get<User>("SELECT * FROM users WHERE id = ?", [id]);
  },
  byLineId(lineUserId: string): User | undefined {
    return getDb().get<User>("SELECT * FROM users WHERE line_user_id = ?", [lineUserId]);
  },
  create(input: Partial<User> & { display_name: string }): User {
    const db = getDb();
    const id = input.id ?? uuid();
    const now = nowIso();
    db.run(
      `INSERT INTO users (id, line_user_id, display_name, picture_url, email, role, status, created_at, last_login_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, input.line_user_id ?? null, input.display_name, input.picture_url ?? null,
        input.email ?? null, input.role ?? "member", input.status ?? "active", now, now,
      ]
    );
    return usersRepo.byId(id)!;
  },
  touchLogin(id: string): void {
    getDb().run("UPDATE users SET last_login_at = ? WHERE id = ?", [nowIso(), id]);
  },
  setStatus(id: string, status: "active" | "suspended"): void {
    getDb().run("UPDATE users SET status = ? WHERE id = ?", [status, id]);
  },
  count(): number {
    return getDb().get<{ c: number }>("SELECT COUNT(*) c FROM users")?.c ?? 0;
  },
};

// ---- Subscriptions ----
export const subsRepo = {
  forUser(userId: string): Subscription | undefined {
    return getDb().get<Subscription>(
      "SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
      [userId]
    );
  },
  create(userId: string, tier: Tier, opts: Partial<Subscription> = {}): Subscription {
    const db = getDb();
    const id = uuid();
    const now = nowIso();
    db.run(
      `INSERT INTO subscriptions (id, user_id, tier, status, source, started_at, current_period_end,
        ecpay_merchant_member_id, ecpay_gwsr, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, userId, tier, opts.status ?? "active", opts.source ?? "manual", opts.started_at ?? now,
        opts.current_period_end ?? null, opts.ecpay_merchant_member_id ?? null,
        opts.ecpay_gwsr ?? null, opts.note ?? null, now, now,
      ]
    );
    return getDb().get<Subscription>("SELECT * FROM subscriptions WHERE id = ?", [id])!;
  },
  update(id: string, fields: Partial<Pick<Subscription, "tier" | "status" | "current_period_end" | "note" | "source">>): void {
    const sets: string[] = [];
    const params: unknown[] = [];
    for (const [k, v] of Object.entries(fields)) {
      sets.push(`${k} = ?`);
      params.push(v);
    }
    if (!sets.length) return;
    sets.push("updated_at = ?");
    params.push(nowIso());
    params.push(id);
    getDb().run(`UPDATE subscriptions SET ${sets.join(", ")} WHERE id = ?`, params);
  },
  /** 確保有一筆訂閱，沒有就建免費 */
  ensure(userId: string): Subscription {
    return subsRepo.forUser(userId) ?? subsRepo.create(userId, "free");
  },
  countByTier(): Record<string, number> {
    const rows = getDb().all<{ tier: string; c: number }>(
      "SELECT tier, COUNT(*) c FROM subscriptions GROUP BY tier"
    );
    return Object.fromEntries(rows.map((r) => [r.tier, r.c]));
  },
};

// ---- 會員列表 (join 最新訂閱) ----
export const membersRepo = {
  list(opts: { q?: string; tier?: string; limit?: number; offset?: number } = {}): MemberRow[] {
    const where: string[] = [];
    const params: unknown[] = [];
    if (opts.q) {
      where.push("(u.display_name LIKE ? OR u.email LIKE ? OR u.line_user_id LIKE ?)");
      const like = `%${opts.q}%`;
      params.push(like, like, like);
    }
    if (opts.tier) {
      where.push("s.tier = ?");
      params.push(opts.tier);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const limit = opts.limit ?? 50;
    const offset = opts.offset ?? 0;
    return getDb().all<MemberRow>(
      `SELECT u.*, s.tier AS tier, s.status AS sub_status, s.current_period_end AS current_period_end
       FROM users u
       LEFT JOIN subscriptions s ON s.id = (
         SELECT id FROM subscriptions WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1
       )
       ${whereSql}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
  },
};

// ---- 稽核日誌 ----
export const auditRepo = {
  log(actor: string, action: string, targetUser?: string, detail?: string): void {
    getDb().run(
      "INSERT INTO admin_audit (id, actor, action, target_user, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [uuid(), actor, action, targetUser ?? null, detail ?? null, nowIso()]
    );
  },
  recent(limit = 50): Array<{ id: string; actor: string; action: string; target_user: string | null; detail: string | null; created_at: string }> {
    return getDb().all("SELECT * FROM admin_audit ORDER BY created_at DESC LIMIT ?", [limit]);
  },
};

// ---- 報牌寄送 ----
export const deliveriesRepo = {
  log(userId: string, game: string, channel: string, status: string, opts: { drawPeriod?: string; detail?: string } = {}): void {
    getDb().run(
      "INSERT INTO pick_deliveries (id, user_id, game, draw_period, channel, status, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [uuid(), userId, game, opts.drawPeriod ?? null, channel, status, opts.detail ?? null, nowIso()]
    );
  },
  recent(limit = 50) {
    return getDb().all(
      `SELECT d.*, u.display_name FROM pick_deliveries d JOIN users u ON u.id = d.user_id
       ORDER BY d.created_at DESC LIMIT ?`,
      [limit]
    );
  },
};

// ---- 推播對象 ----
export const pushRepo = {
  upsert(userId: string, lineUserId: string, enabled = true): void {
    getDb().run(
      `INSERT INTO push_targets (user_id, line_user_id, enabled, created_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET line_user_id=excluded.line_user_id, enabled=excluded.enabled`,
      [userId, lineUserId, enabled ? 1 : 0, nowIso()]
    );
  },
  enabledTargets() {
    return getDb().all<{ user_id: string; line_user_id: string }>(
      "SELECT user_id, line_user_id FROM push_targets WHERE enabled = 1"
    );
  },
};
