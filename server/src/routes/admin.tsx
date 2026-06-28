import { Hono } from "hono";
import { requireAdmin, issueSession, clearSession, checkAdminCredentials } from "../auth.js";
import { usersRepo, subsRepo, membersRepo, auditRepo, deliveriesRepo } from "../repos.js";
import { LoginPage, Dashboard, MembersPage, MemberDetail, AuditPage, DeliveriesPage } from "../views/pages.js";
import { lineConfigured, ecpayConfigured, lineMessagingConfigured } from "../config.js";
import { runDailyReport } from "../reports.js";
import { addDaysIso } from "../util.js";
import type { Tier } from "../plans.js";

function configWarn(): string[] {
  const w: string[] = [];
  if (!lineConfigured()) w.push("LINE Login");
  if (!lineMessagingConfigured()) w.push("LINE 推播");
  if (!ecpayConfigured()) w.push("綠界金流");
  return w;
}

export const admin = new Hono();

// ---- 登入 ----
admin.get("/login", (c) => c.html(<LoginPage />));
admin.post("/login", async (c) => {
  const body = await c.req.parseBody();
  const user = String(body.user ?? "");
  const pass = String(body.password ?? "");
  if (!checkAdminCredentials(user, pass)) {
    return c.html(<LoginPage error="帳號或密碼錯誤" />);
  }
  await issueSession(c, { sub: "admin", role: "admin", name: user });
  auditRepo.log(user, "登入後台");
  return c.redirect("/admin");
});
admin.get("/logout", (c) => {
  clearSession(c);
  return c.redirect("/admin/login");
});

// 以下需 admin
admin.use("/*", requireAdmin);

// ---- 儀表板 ----
admin.get("/", (c) => {
  const s = c.get("session") as { name: string };
  const byTier = subsRepo.countByTier();
  const stats = {
    totalUsers: usersRepo.count(),
    byTier,
    paying: (byTier.pro ?? 0) + (byTier.max ?? 0),
    recentMembers: membersRepo.list({ limit: 8 }),
  };
  return c.html(<Dashboard session={s} stats={stats} configWarn={configWarn()} />);
});

// ---- 會員列表 ----
admin.get("/members", (c) => {
  const s = c.get("session") as { name: string };
  const q = c.req.query("q") ?? "";
  const tier = c.req.query("tier") ?? "";
  const rows = membersRepo.list({ q: q || undefined, tier: tier || undefined, limit: 100 });
  return c.html(<MembersPage session={s} rows={rows} q={q} tier={tier} configWarn={configWarn()} />);
});

// ---- 會員詳情 ----
admin.get("/members/:id", (c) => {
  const s = c.get("session") as { name: string };
  const id = c.req.param("id");
  const user = usersRepo.byId(id);
  if (!user) return c.notFound();
  const sub = subsRepo.ensure(id);
  const deliveries = deliveriesRepo.recent(20).filter((d: { user_id: string }) => d.user_id === id) as never[];
  return c.html(<MemberDetail session={s} user={user} sub={sub} deliveries={deliveries} configWarn={configWarn()} />);
});

// ---- 改帳號狀態 (停權/解除) ----
admin.post("/members/:id/status", async (c) => {
  const s = c.get("session") as { name: string };
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const status = String(body.status) === "suspended" ? "suspended" : "active";
  usersRepo.setStatus(id, status);
  auditRepo.log(s.name, status === "suspended" ? "停權會員" : "解除停權", id);
  return c.redirect(`/admin/members/${id}`);
});

// ---- 改訂閱 ----
admin.post("/members/:id/subscription", async (c) => {
  const s = c.get("session") as { name: string };
  const id = c.req.param("id");
  const body = await c.req.parseBody();
  const tier = String(body.tier ?? "free") as Tier;
  const status = String(body.status ?? "active");
  const extendDays = Number(body.extendDays ?? 0);
  const sub = subsRepo.ensure(id);
  const fields: Record<string, unknown> = { tier, status };
  if (extendDays > 0) {
    const base = sub.current_period_end && new Date(sub.current_period_end) > new Date()
      ? new Date(sub.current_period_end) : new Date();
    fields.current_period_end = addDaysIso(extendDays, base);
  }
  subsRepo.update(sub.id, fields);
  auditRepo.log(s.name, "調整訂閱", id, `tier=${tier} status=${status}${extendDays > 0 ? ` +${extendDays}天` : ""}`);
  return c.redirect(`/admin/members/${id}`);
});

// ---- 稽核 ----
admin.get("/audit", (c) => {
  const s = c.get("session") as { name: string };
  return c.html(<AuditPage session={s} rows={auditRepo.recent(100)} configWarn={configWarn()} />);
});

// ---- 報牌紀錄 ----
admin.get("/deliveries", (c) => {
  const s = c.get("session") as { name: string };
  return c.html(<DeliveriesPage session={s} rows={deliveriesRepo.recent(100) as never[]} configWarn={configWarn()} />);
});
admin.post("/deliveries/run", async (c) => {
  const s = c.get("session") as { name: string };
  const res = await runDailyReport("daily539");
  auditRepo.log(s.name, "手動觸發報牌", undefined, `寄送${res.sent} 略過${res.skipped}${res.stub ? " (LINE stub)" : ""}`);
  return c.redirect("/admin/deliveries");
});
