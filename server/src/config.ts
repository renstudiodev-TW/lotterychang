// 設定集中讀取。憑證一律走環境變數，絕不寫死、不 commit。
function env(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

export const config = {
  port: Number(env("PORT", "8787")),
  baseUrl: env("BASE_URL", "http://localhost:8787"),

  // 後台管理員 (單一管理者 = RC)。正式環境務必用環境變數覆蓋。
  adminUser: env("ADMIN_USER", "admin"),
  adminPassword: env("ADMIN_PASSWORD", "changeme-dev-only"),

  // session 簽章金鑰
  sessionSecret: env("SESSION_SECRET", "dev-insecure-secret-change-me"),

  // LINE Login (頻道憑證，RC 在 LINE Developers 建立後填入)
  line: {
    channelId: env("LINE_CHANNEL_ID"),
    channelSecret: env("LINE_CHANNEL_SECRET"),
    callbackUrl: env("LINE_CALLBACK_URL", "http://localhost:8787/auth/line/callback"),
    // LINE 官方帳號 Messaging API 推播 token
    messagingToken: env("LINE_MESSAGING_TOKEN"),
  },

  // 綠界 ECPay 定期定額 (商家以公司統編 61138241 申請後填入)
  ecpay: {
    merchantId: env("ECPAY_MERCHANT_ID"),
    hashKey: env("ECPAY_HASH_KEY"),
    hashIv: env("ECPAY_HASH_IV"),
    // 測試環境 / 正式環境端點
    aioUrl: env("ECPAY_AIO_URL", "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5"),
  },
};

export function lineConfigured(): boolean {
  return Boolean(config.line.channelId && config.line.channelSecret);
}
export function ecpayConfigured(): boolean {
  return Boolean(config.ecpay.merchantId && config.ecpay.hashKey && config.ecpay.hashIv);
}
export function lineMessagingConfigured(): boolean {
  return Boolean(config.line.messagingToken);
}
