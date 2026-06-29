"use client";

import { useEffect, useState } from "react";

// 判斷一組「以第 dataPeriod 期資料算出的精選」是否已過期：
// 若台彩最新開獎期數 > dataPeriod，代表那一期已開獎，這組精選對下一期已失效。
export function useFreshness(game: string, dataPeriod?: string | null) {
  const [stale, setStale] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState<string>("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!dataPeriod) {
      setReady(true);
      return;
    }
    fetch("/api/draws", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const draw = (d?.draws ?? []).find((x: { game: string; period: string }) => x.game === game);
        if (draw?.period) {
          setCurrentPeriod(String(draw.period));
          // 同遊戲期數為固定長度數字字串，字串比較等同數值比較
          setStale(String(draw.period) > String(dataPeriod));
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, [game, dataPeriod]);

  return { stale, currentPeriod, ready };
}
