import { get, push, ref, runTransaction, set } from "firebase/database";
import { db } from "../identity/firebase";
import type { RedemptionRecord } from "./types";

// 商户核销 —— 2026-09-27 阶段 3 开工时和 Diasy 确认过的范围（见 journal.md 与
// build-plan.md 阶段 3 行）：database.rules.json / schema README 最初都假设
// redeemed_at 只能由商户端扫码页面触发的 Cloud Function（Admin SDK）写入，
// 但这与阶段 2 已经推翻的"不用 Cloud Functions/Blaze"决定不一致。经确认：
// demo 阶段不做真实核销校验——没有真正的二维码生成/扫描识别，也没有区分
// "登录的是不是真的商户"；qr_token 直接等于 redemption_id，商户端页面
// （MerchantScan/M1.tsx）本质上只是同一个 App 里的一个页面，输入这个 id 就能
// 把 redeemed_at 写成当前时间。这是一处明确记录的简化，量产阶段需要补回
// 服务端校验才能真正杜绝"玩家自己把自己的记录标记成已核销"。

// Credits 在这一步扣減，不是核销那一步——即使核销状态被伪造，也不会导致
// 二次扣款或余额错误，这条边界没有被这次简化破坏。
export async function createRedemption(
  workspaceId: string,
  merchantId: string,
  creditsCost: number
): Promise<RedemptionRecord | null> {
  const balanceRef = ref(db, `workspaces/${workspaceId}/credits_balance`);
  const spendResult = await runTransaction(balanceRef, (current: number | null) => {
    const balance = current ?? 0;
    if (balance < creditsCost) return; // abort：余额不够，中止事务，不留下半扣的记录
    return balance - creditsCost;
  });
  if (!spendResult.committed) return null;

  const recordRef = push(ref(db, "redemption_records"));
  const redemptionId = recordRef.key as string;
  const record: RedemptionRecord = {
    redemption_id: redemptionId,
    workspace_id: workspaceId,
    merchant_id: merchantId,
    credits_spent: creditsCost,
    qr_token: redemptionId,
    redeemed_at: null,
    created_at: Date.now(),
  };
  await set(recordRef, record);
  return record;
}

// 商户端页面调用：按玩家出示的 id（= qr_token = redemption_id）直接写入
// redeemed_at。用 runTransaction 保证同一条记录只能被核销一次（哪怕商户端
// 页面被连续点两次提交按钮）。
export async function markRedeemed(redemptionId: string): Promise<"ok" | "already_redeemed" | "not_found"> {
  // 先确认这条记录真的存在——否则下面的 runTransaction 在 current === null 时
  // 会当成"还没核销过"直接提交，把 redeemed_at 写在一个压根不存在的 redemption_id
  // 下面（凭空造出一条只有 redeemed_at、没有 workspace_id/credits_spent 的悬空记录）。
  // 这一步和事务之间有极小的竞态窗口（demo 阶段接受，量产阶段应该合并进一次
  // 服务端事务），但足够避免"随便输一个 id 也能核销成功"这个更明显的问题。
  const recordSnapshot = await get(ref(db, `redemption_records/${redemptionId}`));
  if (!recordSnapshot.exists()) return "not_found";
  if (recordSnapshot.val()?.redeemed_at != null) return "already_redeemed";

  const redeemedAtRef = ref(db, `redemption_records/${redemptionId}/redeemed_at`);
  const result = await runTransaction(redeemedAtRef, (current: number | null) => {
    if (current !== null) return; // 已经核销过，中止
    return Date.now();
  });
  return result.committed ? "ok" : "already_redeemed";
}
