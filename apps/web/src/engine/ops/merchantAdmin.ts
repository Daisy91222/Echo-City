import { onValue, ref, update } from "firebase/database";
import { useEffect, useState } from "react";
import { db } from "../identity/firebase";
import type { Merchant } from "../collection/types";

// 对应 §3.10：merchant / discount_config 由运营专员读写——这是和
// currencyConfig.ts 相反的一半，凑成"运营专员改得了商户折扣、改不了 Credits
// 上限"这条 §1.9.1 分权设计的完整对比。这个 Firebase 节点从建库起就有对应规则，
// 但从未被任何界面写过：App 其余部分（Redemption/C2）读的是 content-loader
// 里的静态 merchants.json，不读这个 Firebase 实时节点，所以这里的写入不会让
// C2 页面立刻显示新数据——如实说明，见 O1.tsx 页面文案。这次的目的只是验证
// "运营专员写得进 merchants、写不进 currency_channel_config"这条对比本身成立，
// 不是要把 content-loader 改造成读 Firebase 实时数据（那超出阶段 5 范围）。
export function useLiveMerchants() {
  const [merchants, setMerchants] = useState<Record<string, Merchant>>({});
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = onValue(
      ref(db, "merchants"),
      (snap) => {
        setMerchants(snap.exists() ? (snap.val() as Record<string, Merchant>) : {});
        setReadError(null);
        setLoading(false);
      },
      (err) => {
        setReadError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  return { merchants, loading, readError };
}

export async function saveMerchant(merchant: Merchant): Promise<void> {
  await update(ref(db, `merchants/${merchant.merchant_id}`), { ...merchant });
}
