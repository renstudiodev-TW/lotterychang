// 綠界 ECPay 信用卡定期定額。憑證未設定時回 stub，方便本地開發。
// 正式串接需 RC 以公司 (統編 61138241) 申請特約賣家後填入金鑰。
import { createHash } from "node:crypto";
import { config, ecpayConfigured } from "../config.js";

/** 綠界 CheckMacValue：參數排序 → URL encode → SHA256 大寫 */
export function checkMacValue(params: Record<string, string>): string {
  const sorted = Object.keys(params)
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  const raw = `HashKey=${config.ecpay.hashKey}&${sorted}&HashIV=${config.ecpay.hashIv}`;
  // 綠界 .NET URLEncode 規則
  const encoded = encodeURIComponent(raw)
    .toLowerCase()
    .replace(/%20/g, "+")
    .replace(/%21/g, "!")
    .replace(/%28/g, "(")
    .replace(/%29/g, ")")
    .replace(/%2a/g, "*")
    .replace(/%2d/g, "-")
    .replace(/%2e/g, ".")
    .replace(/%5f/g, "_");
  return createHash("sha256").update(encoded).digest("hex").toUpperCase();
}

export interface SubscriptionCheckout {
  /** form POST 的目標 URL */
  action: string;
  /** 要 POST 的隱藏欄位 */
  fields: Record<string, string>;
  stub?: boolean;
}

/**
 * 建立定期定額付款表單參數。
 * periodType: M(月) / Y(年)；frequency 每幾期扣一次；execTimes 總扣款次數。
 */
export function createSubscriptionCheckout(input: {
  tradeNo: string; // 自訂訂單編號 (英數，<=20)
  amount: number;
  itemName: string;
  returnUrl: string; // 綠界 server 端回呼
  clientBackUrl: string; // 付款完成導回
  periodType?: "D" | "M" | "Y";
  frequency?: number;
  execTimes?: number;
  tradeDate: string; // "yyyy/MM/dd HH:mm:ss" (由呼叫端帶入，避免此處依賴系統時間)
}): SubscriptionCheckout {
  if (!ecpayConfigured()) {
    return {
      action: "#ecpay-not-configured",
      stub: true,
      fields: {
        _note: "綠界憑證未設定，這是 stub。填入 ECPAY_MERCHANT_ID/HASH_KEY/HASH_IV 後即為真實表單。",
        MerchantTradeNo: input.tradeNo,
        TotalAmount: String(input.amount),
        ItemName: input.itemName,
      },
    };
  }
  const fields: Record<string, string> = {
    MerchantID: config.ecpay.merchantId,
    MerchantTradeNo: input.tradeNo,
    MerchantTradeDate: input.tradeDate,
    PaymentType: "aio",
    TotalAmount: String(input.amount),
    TradeDesc: "牌靈 AI 訂閱",
    ItemName: input.itemName,
    ReturnURL: input.returnUrl,
    ClientBackURL: input.clientBackUrl,
    ChoosePayment: "Credit",
    EncryptType: "1",
    // 定期定額
    PeriodAmount: String(input.amount),
    PeriodType: input.periodType ?? "M",
    Frequency: String(input.frequency ?? 1),
    ExecTimes: String(input.execTimes ?? 99),
  };
  fields.CheckMacValue = checkMacValue(fields);
  return { action: config.ecpay.aioUrl, fields };
}

/** 驗證綠界回呼的 CheckMacValue */
export function verifyCallback(params: Record<string, string>): boolean {
  if (!ecpayConfigured()) return false;
  const { CheckMacValue, ...rest } = params;
  return checkMacValue(rest) === CheckMacValue;
}
