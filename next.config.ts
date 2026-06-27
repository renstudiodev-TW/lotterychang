import type { NextConfig } from "next";

// GitHub Pages 專案頁需 basePath；本地 dev / 未來 Cloudflare 自有網域則留空。
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export", // 純靜態輸出，可丟任何靜態主機 (GitHub Pages / Cloudflare Pages / Netlify)
  basePath: basePath || undefined,
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
