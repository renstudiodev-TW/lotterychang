// 藍新金流 NewebPay 信用卡定期定額（建立委託 NPA-B05）整合。
// 依官方「信用卡定期定額技術串接手冊 NDNP-1.0.4」實作。
//
// 流程：把委託參數組成 URL 查詢字串 → 用商店 HashKey/HashIV 做 AES-256-CBC(PKCS7) 加密成
//   PostData_ → 連同 MerchantID_ 以 HTML form POST 到 /MPG/period 付款頁。
//   消費者刷卡完成後，藍新以幕後 POST 把加密的 Period 字串送到 NotifyURL，解密驗證後更新訂閱。
//
// 注意：定期定額用「MerchantID_ + PostData_」兩欄，沒有 TradeSha（那是一般幕前支付 MPG 的格式）。
import { createCipheriv, createDecipheriv } from "node:crypto";
import { config, ecpayConfigured as paymentConfigured } from "../config.js";

// ── AES-256-CBC（key=HashKey 32 bytes、iv=HashIV 16 bytes，輸出 hex 小寫）──
function aesEncrypt(plain: string, key: string, iv: string): string {
  const cipher = createCipheriv("aes-256-cbc", Buffer.from(key, "utf8"), Buffer.from(iv, "utf8"));
  // Node 預設即 PKCS7 padding，對應藍新 PHP 範例的 OPENSSL_RAW_DATA。
  return cipher.update(plain, "utf8", "hex") + cipher.final("hex");
}

function aesDecrypt(hex: string, key: string, iv: string): string {
  const decipher = createDecipheriv("aes-256-cbc", Buffer.from(key, "utf8"), Buffer.from(iv, "utf8"));
  decipher.setAutoPadding(false); // 自行去 padding，相容藍新可能的 zero/PKCS7 padding
  const out = Buffer.concat([decipher.update(Buffer.from(hex, "hex")), decipher.final()]);
  return stripPadding(out).toString("utf8");
}

// 去除尾端 PKCS7 或 zero padding
function stripPadding(buf: Buffer): Buffer {
  if (buf.length === 0) return buf;
  const last = buf[buf.length - 1];
  if (last > 0 && last <= 16) {
    // 檢查是否為合法 PKCS7（尾端 last 個 byte 都等於 last）
    let pkcs7 = true;
    for (let i = buf.length - last; i < buf.length; i++) if (buf[i] !== last) { pkcs7 = false; break; }
    if (pkcs7) return buf.subarray(0, buf.length - last);
  }
  // 否則去除尾端 \0（zero padding）
  let end = buf.length;
  while (end > 0 && buf[end - 1] === 0) end--;
  return buf.subarray(0, end);
}

export interface SubscriptionCheckout {
  action: string; // form POST 目標（藍新付款頁）
  fields: Record<string, string>; // 隱藏欄位：MerchantID_ / PostData_
  merOrderNo: string;
  stub?: boolean;
}

export type PeriodType = "D" | "W" | "M" | "Y";

/**
 * 建立定期定額委託付款表單。
 * @param periodStartType 首期驗證模式：1=立即十元授權、2=立即首期金額授權(訂閱常用)、3=不檢查不授權
 */
export function createSubscriptionCheckout(input: {
  orderNo: string;
  amount: number;
  itemName: string;
  email: string;
  periodType?: PeriodType;
  periodPoint?: string; // M:01~31、W:1~7、D:2~999、Y:MMDD
  periodTimes?: number; // 授權期數
  periodStartType?: 1 | 2 | 3;
  returnUrl: string; // 刷卡完成導回（前台）
  notifyUrl: string; // 幕後通知（後端 webhook）
  backUrl?: string;
}): SubscriptionCheckout {
  if (!paymentConfigured()) {
    return {
      action: "#newebpay-not-configured",
      stub: true,
      merOrderNo: input.orderNo,
      fields: {
        _note: "藍新憑證未設定（NEWEBPAY_MERCHANT_ID / HASH_KEY / HASH_IV）。",
        MerchantID_: "",
        PostData_: "",
      },
    };
  }

  const params: Record<string, string> = {
    RespondType: "JSON",
    TimeStamp: String(Math.floor(Date.now() / 1000)),
    Version: "1.5",
    LangType: "zh-Tw",
    MerOrderNo: input.orderNo,
    ProdDesc: input.itemName,
    PeriodAmt: String(input.amount),
    PeriodType: input.periodType ?? "M",
    PeriodPoint: input.periodPoint ?? "01",
    PeriodStartType: String(input.periodStartType ?? 2),
    PeriodTimes: String(input.periodTimes ?? 99),
    PayerEmail: input.email,
    EmailModify: "0",
    PaymentInfo: "N",
    OrderInfo: "N",
    ReturnURL: input.returnUrl,
    NotifyURL: input.notifyUrl,
    ...(input.backUrl ? { BackURL: input.backUrl } : {}),
  };

  // http_build_query 等價：URLSearchParams 空白編成 +，與藍新 PHP 範例一致
  const query = new URLSearchParams(params).toString();
  const postData = aesEncrypt(query, config.pay.hashKey, config.pay.hashIv);

  return {
    action: config.pay.apiUrl,
    merOrderNo: input.orderNo,
    fields: {
      MerchantID_: config.pay.merchantId,
      PostData_: postData,
    },
  };
}

export interface NotifyResult {
  status: string; // SUCCESS 或錯誤代碼
  message: string;
  result: Record<string, unknown>; // MerchantID / MerchantOrderNo / PeriodType / PeriodAmt / AuthTimes / PeriodNo / TradeNo ...
}

/** 解密並解析藍新幕後通知（Notify）送來的 Period 加密字串。 */
export function parseNotify(periodHex: string): NotifyResult {
  const json = aesDecrypt(periodHex, config.pay.hashKey, config.pay.hashIv);
  const parsed = JSON.parse(json) as { Status: string; Message: string; Result: Record<string, unknown> };
  return { status: parsed.Status, message: parsed.Message, result: parsed.Result ?? {} };
}

/** 測試/除錯用：直接拿到加解密原子函式（不對外路由使用）。 */
export const _crypto = { aesEncrypt, aesDecrypt };
