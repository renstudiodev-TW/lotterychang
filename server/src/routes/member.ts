import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { requireMember, issueSession, clearSession } from "../auth.js";
import { getLoginUrl, exchangeCode } from "../integrations/line.js";
import { usersRepo, subsRepo, pushRepo } from "../repos.js";
import { lineConfigured, config } from "../config.js";
import { loadFull } from "../reports.js";
import { tierMeets } from "../plans.js";
import { uuid } from "../util.js";

export const member = new Hono();

// ---- LINE Login 啟動 ----
member.get("/auth/line/login", async (c) => {
  if (!lineConfigured()) {
    return c.text("LINE Login 尚未設定憑證。開發測試請用 /auth/dev-login。", 503);
  }
  const state = uuid();
  const nonce = uuid();
  setCookie(c, "line_state", state, { httpOnly: true, sameSite: "Lax", path: "/", maxAge: 600 });
  return c.redirect(getLoginUrl(state, nonce));
});

// ---- LINE 回呼 ----
member.get("/auth/line/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const saved = getCookie(c, "line_state");
  if (!code || !state || state !== saved) return c.text("登入驗證失敗 (state 不符)", 400);
  try {
    const prof = await exchangeCode(code);
    let user = usersRepo.byLineId(prof.lineUserId);
    if (!user) {
      user = usersRepo.create({
        line_user_id: prof.lineUserId,
        display_name: prof.displayName,
        picture_url: prof.pictureUrl ?? null,
        email: prof.email ?? null,
      });
      subsRepo.ensure(user.id);
    }
    usersRepo.touchLogin(user.id);
    // 登入即把 LINE 設為推播對象 (報牌用)
    pushRepo.upsert(user.id, prof.lineUserId, true);
    await issueSession(c, { sub: user.id, role: "member", name: user.display_name });
    return c.redirect("/"); // 之後改導回前台會員區
  } catch (e) {
    return c.text(`LINE 登入失敗：${(e as Error).message}`, 500);
  }
});

// ---- 開發測試登入 (僅在未設定 LINE 時可用) ----
member.get("/auth/dev-login", async (c) => {
  if (lineConfigured()) return c.text("正式環境停用 dev-login", 403);
  const name = c.req.query("name") || "測試會員";
  const fakeLineId = `dev_${name}`;
  let user = usersRepo.byLineId(fakeLineId);
  if (!user) {
    user = usersRepo.create({ line_user_id: fakeLineId, display_name: name });
    subsRepo.ensure(user.id);
  }
  usersRepo.touchLogin(user.id);
  pushRepo.upsert(user.id, fakeLineId, true);
  await issueSession(c, { sub: user.id, role: "member", name: user.display_name });
  return c.json({ ok: true, userId: user.id, name: user.display_name, note: "已登入 (dev)" });
});

member.get("/auth/logout", (c) => {
  clearSession(c);
  return c.redirect("/");
});

// ---- 會員 API ----
member.get("/api/me", requireMember, (c) => {
  const s = c.get("session") as { sub: string };
  const user = usersRepo.byId(s.sub);
  if (!user) return c.json({ error: "not found" }, 404);
  const sub = subsRepo.ensure(user.id);
  return c.json({
    id: user.id,
    name: user.display_name,
    picture: user.picture_url,
    tier: sub.tier,
    subStatus: sub.status,
    periodEnd: sub.current_period_end,
  });
});

// ---- 付費解鎖：高機率完整號碼 (tier >= pro) ----
member.get("/api/me/picks", requireMember, (c) => {
  const s = c.get("session") as { sub: string };
  const game = c.req.query("game") ?? "daily539";
  const sub = subsRepo.ensure(s.sub);
  if (!tierMeets(sub.tier, "pro")) {
    return c.json({ error: "需要進階以上訂閱", tier: sub.tier }, 403);
  }
  const b = loadFull(game);
  if (!b) return c.json({ error: "no data" }, 404);
  const picks = b.score.slice(0, b.pick).map((x) => ({ n: x.n, score: x.score }));
  return c.json({ game, period: b.latest?.period, picks });
});

// ---- 開關 LINE 推播 ----
member.post("/api/me/push", requireMember, async (c) => {
  const s = c.get("session") as { sub: string };
  const user = usersRepo.byId(s.sub);
  if (!user?.line_user_id) return c.json({ error: "無 LINE 綁定" }, 400);
  const body = await c.req.parseBody().catch(() => ({}));
  const enabled = String((body as Record<string, unknown>).enabled ?? "true") !== "false";
  pushRepo.upsert(user.id, user.line_user_id, enabled);
  return c.json({ ok: true, enabled });
});

// 避免未使用 import 警告
void config;
