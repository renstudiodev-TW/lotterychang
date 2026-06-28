// 808888 品牌標誌：兩個筊杯(擲筊)交疊成「8」，一冷(藍紫)一熱(紅紫)，中間聖筊/數據綠點。
// 概念：台灣廟宇求明牌的筊杯 × 賽博霓虹 = 玄學 × 數據。避開機器人/大腦等罐頭 AI 視覺。

export function Logo({ size = 30, withGlow = false }: { size?: number; withGlow?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="808888"
    >
      <defs>
        <linearGradient id="logo-cold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#00F0FF" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id="logo-hot" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#FF2A5F" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
        {withGlow && (
          <filter id="logo-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>
      <g filter={withGlow ? "url(#logo-glow)" : undefined}>
        {/* 上筊杯（冷／數據） */}
        <circle
          cx="24" cy="16.5" r="9.5"
          stroke="url(#logo-cold)" strokeWidth="5" strokeLinecap="round"
          fill="none" strokeDasharray="46 14" transform="rotate(128 24 16.5)"
        />
        {/* 下筊杯（熱／運勢） */}
        <circle
          cx="24" cy="31.5" r="9.5"
          stroke="url(#logo-hot)" strokeWidth="5" strokeLinecap="round"
          fill="none" strokeDasharray="46 14" transform="rotate(-52 24 31.5)"
        />
        {/* 聖筊／數據綠點 */}
        <circle cx="24" cy="24" r="1.8" fill="#00FF87" />
      </g>
    </svg>
  );
}
