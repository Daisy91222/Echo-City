// 对应 §3.3（宠物，引擎，全局）
export type PetSpecies = "mochi" | "brick" | "sprout";
export type MoodTier = "low" | "mid" | "high";

export interface Pet {
  account_id: string;
  species: PetSpecies;
  last_fed_at: number;
  wandered_off: boolean;
  wandered_anchor_id?: string;
  // 阶段 4（陪伴细化）新增：花 Credits 购买的自动喂食器到期时间戳。
  // undefined/缺失 = 从未买过或已过期，和"过期时间戳 <= now"视觉上是同一种状态，
  // 调用方统一用 isAutoFeederActive() 判断，不直接比较这个字段。
  auto_feeder_active_until?: number;
}
