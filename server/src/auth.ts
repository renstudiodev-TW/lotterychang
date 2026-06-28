// 認證：JWT cookie session。後台 admin 用帳密；會員用 LINE Login。
import { sign, verify } from "hono/jwt";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { Context, MiddlewareHandler } from "hono";
import { config } from "./config.js";

const COOKIE = "plsess";

export interface Session {
  sub: string; // userId 或 "admin"
  role: "admin" | "member";
  name: string;
  exp?: number;
}

export async function issueSession(c: Context, s: Omit<Session, "exp">, days = 7) {
  const exp = Math.floor(Date.now() / 1000) + days * 86400;
  const token = await sign({ ...s, exp }, config.sessionSecret, "HS256");
  setCookie(c, COOKIE, token, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: days * 86400,
    secure: config.baseUrl.startsWith("https"),
  });
}

export function clearSession(c: Context) {
  deleteCookie(c, COOKIE, { path: "/" });
}

export async function readSession(c: Context): Promise<Session | null> {
  const token = getCookie(c, COOKIE);
  if (!token) return null;
  try {
    return (await verify(token, config.sessionSecret, "HS256")) as unknown as Session;
  } catch {
    return null;
  }
}

/** 後台守衛：非 admin 導回登入頁 */
export const requireAdmin: MiddlewareHandler = async (c, next) => {
  const s = await readSession(c);
  if (!s || s.role !== "admin") return c.redirect("/admin/login");
  c.set("session", s);
  await next();
};

/** 會員 API 守衛：未登入回 401 */
export const requireMember: MiddlewareHandler = async (c, next) => {
  const s = await readSession(c);
  if (!s || s.role !== "member") return c.json({ error: "unauthorized" }, 401);
  c.set("session", s);
  await next();
};

/** 後台帳密驗證 */
export function checkAdminCredentials(user: string, pass: string): boolean {
  return user === config.adminUser && pass === config.adminPassword;
}
