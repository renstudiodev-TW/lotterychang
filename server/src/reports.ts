// 每日精選：讀完整分析 (data/full，含未遮罩的高評分號) → 推播給有效訂閱會員。
// 由後台手動觸發 (測試) 或正式環境的 Cloudflare Cron 觸發。
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pushMessage } from "./integrations/line.js";
import { pushRepo, subsRepo, deliveriesRepo, usersRepo, settingsRepo } from "./repos.js";
import { canReceivePush } from "./plans.js";
import fullPicks from "./data/full-picks.json";

interface FullBundle {
  name: string;
  pick: number;
  latest: { period: string; date: string } | null;
  score: Array<{ n: number; score: number }>;
}

// 完整分析資料夾位置。本地 Node 由 import.meta.url 推算；Workers 無此值 → 回 null。
function fullDir(): string | null {
  try {
    const url = import.meta.url;
    if (!url) return null;
    const dir = path.dirname(fileURLToPath(url));
    return path.resolve(dir, "..", "..", "data", "full");
  } catch {
    return null;
  }
}

export function loadFull(game: string): FullBundle | null {
  // 1) 本地 Node：從 data/full 讀完整檔（含所有指標）。
  try {
    const dir = fullDir();
    if (dir) {
      const f = path.join(dir, `${game}.json`);
      if (existsSync(f)) return JSON.parse(readFileSync(f, "utf8")) as FullBundle;
    }
  } catch {
    /* fall through */
  }
  // 2) Workers（無 fs）：用打包進 Worker 的精簡高分 picks（只給已驗證付費會員的 API 用）。
  const b = (fullPicks as Record<string, FullBundle | undefined>)[game];
  return b ?? null;
}

/** 產生某彩種的精選文字 (含高評分精選號，僅付費會員可收) */
export function buildReportText(game: string): string | null {
  const b = loadFull(game);
  if (!b || !b.latest) return null;
  const top = b.score.slice(0, b.pick).map((s) => String(s.n).padStart(2, "0"));
  return [
    `🔮 808888 ${b.name} 每日精選`,
    `期別參考：${b.latest.period}（${b.latest.date}）`,
    ``,
    `AI 高評分精選 ${b.pick} 碼：`,
    `${top.join("、")}`,
    ``,
    `⚠️ 樂透為獨立隨機事件，僅供參考娛樂，不保證中獎。`,
  ].join("\n");
}

// 各彩種開獎日（台灣星期）：今彩539 一到六、大樂透 二五、威力彩 一四。
// 回傳「今天該推哪些彩種」。週日無開獎 → 空陣列。
export function gamesForToday(): string[] {
  const twWeekday = new Date(Date.now() + 8 * 3600 * 1000).getUTCDay(); // 0=日..6=六（台灣時間）
  const map: Record<number, string[]> = {
    0: [],
    1: ["daily539", "superLotto638"],
    2: ["daily539", "lotto649"],
    3: ["daily539"],
    4: ["daily539", "superLotto638"],
    5: ["daily539", "lotto649"],
    6: ["daily539"],
  };
  return map[twWeekday] ?? ["daily539"];
}

/** 把多個彩種的精選合併成一則訊息（省 LINE 額度，一天一則） */
export function buildCombinedText(games: string[]): string | null {
  const sections: string[] = [];
  for (const g of games) {
    const b = loadFull(g);
    if (!b || !b.latest) continue;
    const top = b.score.slice(0, b.pick).map((s) => String(s.n).padStart(2, "0"));
    sections.push(`【${b.name}】參考期 ${b.latest.period}（${b.latest.date}）\nAI 高評分精選：${top.join("、")}`);
  }
  if (sections.length === 0) return null;
  return [
    `🔮 808888 今日精選`,
    ``,
    sections.join("\n\n"),
    ``,
    `⚠️ 樂透為獨立隨機事件，僅供參考娛樂，不保證中獎。`,
  ].join("\n");
}

/**
 * 觸發精選：把「指定彩種（預設今日開獎的）」合併成一則，推給有效付費會員。
 * 回傳寄送摘要。
 */
export async function runDailyReport(games: string[] = ["daily539"]): Promise<{ total: number; sent: number; skipped: number; stub: boolean }> {
  const text = buildCombinedText(games);
  if (!text) return { total: 0, sent: 0, skipped: 0, stub: false };
  // 全域推播開關（後台可關閉，控制 LINE 成本）。
  if (!(await settingsRepo.isPushEnabled())) return { total: 0, sent: 0, skipped: 0, stub: false };

  const targets = await pushRepo.enabledTargets();
  let sent = 0;
  let skipped = 0;
  let stub = false;
  const label = games.join(",");

  for (const t of targets) {
    const user = await usersRepo.byId(t.user_id);
    // ensureActive 會把過期試用/付費降為 free+expired → 自動鎖住推播。
    const sub = await subsRepo.ensureActive(t.user_id);
    // 每日推播：進階以上的付費(active)或試用(trial)會員皆可收；免費/過期/停權不送。
    const eligible = user?.status === "active" && canReceivePush(sub.tier, sub.status);
    if (!eligible) {
      await deliveriesRepo.log(t.user_id, label, "line", "skipped", { detail: "未達推播資格(免費/過期/停權)" });
      skipped++;
      continue;
    }
    const res = await pushMessage(t.line_user_id, [{ type: "text", text }]);
    if (res.stub) stub = true;
    await deliveriesRepo.log(t.user_id, label, "line", res.ok ? "sent" : "failed", {
      detail: res.stub ? "LINE stub (未設定 token)" : `status ${res.status ?? ""}`,
    });
    if (res.ok) sent++;
  }
  return { total: targets.length, sent, skipped, stub };
}
