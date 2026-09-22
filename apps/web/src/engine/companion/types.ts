// 对应 §3.3（宠物，引擎，全局）
export type PetSpecies = "mochi" | "brick" | "sprout";
export type MoodTier = "low" | "mid" | "high";

export interface Pet {
  account_id: string;
  species: PetSpecies;
  last_fed_at: number;
  wandered_off: boolean;
  wandered_anchor_id?: string;
  // mood_tier 不在这个类型里 —— 它是计算字段，客户端不持久化（见 useAuth.ts 注释），
  // 由 moodTier.ts 现算现展示
}
