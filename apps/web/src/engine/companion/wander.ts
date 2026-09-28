import { ref, runTransaction, set } from "firebase/database";
import { db } from "../identity/firebase";
import { listAnchors } from "../../content-loader";
import { isAutoFeederActive } from "./feeding";
import type { Pet } from "./types";

// 阶段 4（陪伴细化）— 对应 §3.3 / R7："长时间不喂随机出走…躲在某锚点，
// 扫描该锚点才能找回，或花 Points 直接叫回（叫回会降低心情）"。
// 数值待定：多久不喂算"长时间"，这里先用占位值，等 Diasy"数值对话"再改。
// 选这个具体数字（而不是更短的调试值）是因为 Diasy 的账号本来就是三周前注册的，
// last_fed_at 早已超过这个阈值——部署后第一次打开主页就会自然触发一次出走，
// 不需要她额外等待或手动改数据库就能测到这条路径，见 build-plan.md 阶段 4 行。
export const WANDER_THRESHOLD_HOURS = 72;
export const POINTS_RECALL_COST = 15;

// 出走判定是客户端在页面加载时算的（没有 cron），用 runTransaction 锁
// wandered_off（false→true 只能发生一次）避免同一个用户开着两个标签页
// 同时判定、各自选了不同的锚点、又各自 set 了一次 wandered_anchor_id。
// 自动喂食器生效期间不会被判定出走——effectiveHoursSinceFed 已经把这种
// 情况折算成 0，这里复用同一个函数，不再重复判断一次 isAutoFeederActive。
export async function checkAndTriggerWander(
  pet: Pet,
  petId: string,
  contentPackId: string,
  nowMs: number = Date.now()
): Promise<boolean> {
  if (pet.wandered_off) return false;
  if (isAutoFeederActive(pet, nowMs)) return false;

  const hoursSinceFed = (nowMs - pet.last_fed_at) / 3_600_000;
  if (hoursSinceFed <= WANDER_THRESHOLD_HOURS) return false;

  const wanderedRef = ref(db, `pets/${petId}/wandered_off`);
  const result = await runTransaction(wanderedRef, (current: boolean | null) => {
    if (current === true) return; // 已经是出走状态，中止
    return true;
  });
  if (!result.committed) return false;

  const anchors = listAnchors(contentPackId);
  if (anchors.length === 0) return true; // 没有锚点可选——记录出走但不指定藏身地点，极端兜底
  const chosen = anchors[Math.floor(Math.random() * anchors.length)];
  await set(ref(db, `pets/${petId}/wandered_anchor_id`), chosen.anchor_id);
  return true;
}

// 扫描到出走宠物躲藏的那个锚点——"找到并安抚"，顺带重置 last_fed_at
// （区别于花 Points 叫回，见下方 recallWithPoints 的注释）。
export async function retrieveByScan(
  pet: Pet,
  petId: string,
  anchorId: string
): Promise<"ok" | "wrong_anchor" | "not_wandered"> {
  if (!pet.wandered_off) return "not_wandered";
  if (pet.wandered_anchor_id !== anchorId) return "wrong_anchor";

  const wanderedRef = ref(db, `pets/${petId}/wandered_off`);
  const result = await runTransaction(wanderedRef, (current: boolean | null) => {
    if (current !== true) return; // 已经被找回过，中止（比如两个标签页同时扫）
    return false;
  });
  if (!result.committed) return "not_wandered";

  await set(ref(db, `pets/${petId}/wandered_anchor_id`), null);
  await set(ref(db, `pets/${petId}/last_fed_at`), Date.now());
  return "ok";
}

// 花 Points 直接叫回——"叫回会降低心情"这条产品要求，在这里的落地方式是
// 不重置 last_fed_at：宠物确实回来了（wandered_off 变 false），但投喂间隔
// 还是那么久，mood_tier 该怎么算还是怎么算，不会因为叫回就变好，这样不需要
// 给 Pet 类型新增一个"心情惩罚"字段就能实现同一个产品效果（无投机性设计）。
export async function recallWithPoints(
  pet: Pet,
  petId: string,
  workspaceId: string
): Promise<"ok" | "insufficient_points" | "not_wandered"> {
  if (!pet.wandered_off) return "not_wandered";

  const balanceRef = ref(db, `workspaces/${workspaceId}/points_balance`);
  const spendResult = await runTransaction(balanceRef, (current: number | null) => {
    const balance = current ?? 0;
    if (balance < POINTS_RECALL_COST) return; // abort：Points 不够
    return balance - POINTS_RECALL_COST;
  });
  if (!spendResult.committed) return "insufficient_points";

  const wanderedRef = ref(db, `pets/${petId}/wandered_off`);
  await runTransaction(wanderedRef, () => false);
  await set(ref(db, `pets/${petId}/wandered_anchor_id`), null);
  return "ok";
}
