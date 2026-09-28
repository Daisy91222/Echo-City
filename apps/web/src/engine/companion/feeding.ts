import { ref, runTransaction, set } from "firebase/database";
import { db } from "../identity/firebase";
import type { Pet } from "./types";

// 阶段 4（陪伴细化）— 对应 §3.3 / R7："叫回宠物花 Points，自动喂食器花 Credits"。
// 数值待定（同 §1.5"待定 1–6"同类问题）：自动喂食器的 Credits 价格和持续时长，
// 这里先用占位值把机制跑通，等 Diasy"数值对话"给真实数字时只改这两个常量即可。
export const AUTO_FEEDER_COST_CREDITS = 30;
export const AUTO_FEEDER_DURATION_HOURS = 24;

export function isAutoFeederActive(pet: Pet, nowMs: number = Date.now()): boolean {
  return (pet.auto_feeder_active_until ?? 0) > nowMs;
}

// mood_tier 的计算输入是"距上次投喂间隔"（§3.3），但自动喂食器生效期间应该
// 让宠物感觉"一直被喂着"——否则花 Credits 买自动喂食器却看不出效果，
// 违背了这个功能本身要解决的问题。所以这里给一个统一的"有效投喂间隔"函数，
// S1 主页 / Companion 面板 / 出走判定三处都用它，不各自重复算一遍。
export function effectiveHoursSinceFed(pet: Pet, nowMs: number = Date.now()): number {
  if (isAutoFeederActive(pet, nowMs)) return 0;
  return (nowMs - pet.last_fed_at) / 3_600_000;
}

// 普通投喂——宠物在家（没有出走）时才有意义，出走状态下的"找回"由 wander.ts
// 的 retrieveByScan/recallWithPoints 负责，不复用这个函数（找回是否顺带重置
// last_fed_at 是两条不同路径各自的产品决定，见 wander.ts 注释）。
export async function feedPet(petId: string): Promise<void> {
  await set(ref(db, `pets/${petId}/last_fed_at`), Date.now());
}

// 购买自动喂食器：先用事务扣 Credits（不够则中止，不留半扣记录——沿用
// redemption.ts createRedemption() 里验证过的同一个模式），扣款成功后再
// 顺延（不是覆盖）到期时间：如果已经在生效中，新买的时长从当前到期时间往后
// 累加，而不是从"现在"重新算，避免"明明还没到期却因为再买一次被缩短"这种
// 反直觉体验。
export async function purchaseAutoFeeder(
  petId: string,
  workspaceId: string,
  pet: Pet
): Promise<"ok" | "insufficient_credits"> {
  const balanceRef = ref(db, `workspaces/${workspaceId}/credits_balance`);
  const spendResult = await runTransaction(balanceRef, (current: number | null) => {
    const balance = current ?? 0;
    if (balance < AUTO_FEEDER_COST_CREDITS) return; // abort：余额不够
    return balance - AUTO_FEEDER_COST_CREDITS;
  });
  if (!spendResult.committed) return "insufficient_credits";

  const now = Date.now();
  const base = Math.max(now, pet.auto_feeder_active_until ?? 0);
  await set(
    ref(db, `pets/${petId}/auto_feeder_active_until`),
    base + AUTO_FEEDER_DURATION_HOURS * 3_600_000
  );
  return "ok";
}
