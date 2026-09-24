// 对应 claude/echocity-prototype.md §3.6（世界事件，引擎）与 build-plan §3 阶段 2 行、
// 报告 L-3.0 / 原型文档 R8。
//
// 阶段 2 实现说明（与 §3.6 原字段表的差异，已记入 build-plan.md/journal.md，供 Diasy 核对）：
// 1. HP 计数器原设计是 hpDecrement callable function（Admin SDK 走 runTransaction()）来写
//    boss_hp_remaining/version/settled；Diasy 2026-09-24 确认改为网页前端直连
//    Realtime Database 的 runTransaction()，配合 database.rules.json 里的校验规则
//    （只能递减、version 必须 +1、settled 只能 false→true 一次），不再需要把 Firebase
//    项目升级到 Blaze 套餐、也不需要部署 Cloud Functions。见 hpCounter.ts。
// 2. member_or_account_id 简化为只支持 account_id（骨架阶段还没有实现 member_slot
//    参战，儿童成员位暂不参与世界事件）。
// 3. geofence 字段这一版没有实现真实地理围栏多边形——demo 阶段用 eligible_to_attack
//    上的一个"模拟定位"开关代替，见 §3.6 原表和 build-plan §3 阶段 2 行"demo 阶段可先用
//    模拟定位代替真实 GPS"。
export interface WorldEvent {
  event_id: string;
  content_pack_id: string;
  starts_at: number;
  ends_at: number;
  landmark_anchor_id: string;
  boss_hp_total: number;
  boss_hp_remaining: number;
  version: number;
  settled: boolean;
  reward_pool_total: number; // 🔧 demo 占位数值，不是数值对话定的最终额度
}

export interface WorldEventParticipation {
  joined_at: number;
  eligible_to_attack: boolean; // 自报字段，demo 阶段用模拟定位开关而非真实校验
  damage_from_minigame: number;
  damage_from_activity: number;
  last_activity_settlement_at: number;
  activity_score_at_last_settlement: number; // 换算基准快照，避免每次都从 0 起算
  reward_claimed?: boolean;
}

export interface RewardShare {
  participantId: string;
  totalDamage: number;
  rank: number;
  rewardAmount: number;
}
