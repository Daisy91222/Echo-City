import type { CollectionProgress } from "../collection/types";

// 对应 §3.2（工作区层，引擎，按园区）
export interface Workspace {
  workspace_id: string;
  account_id: string;
  content_pack_id: string;
  points_balance: number;
  credits_balance: number;
  points_daily_cap?: number; // 🔧 只有平台维护团队能写，demo 阶段可能是 undefined
  // points_daily_used（§3.2 原表里的日已用额度字段）阶段 3 没有加进来：本阶段唯一的
  // Points 来源（收集章节）是"每章只发一次"的一次性奖励，不是可以反复刷的日常产出，
  // 不需要日上限校验；等阶段 4+ 出现真正的日常可重复产出（比如番茄钟）时再补这个字段
  // 和对应的封顶逻辑，避免现在加一个没有任何代码读写它的字段（无投机性设计）。
  collection_progress?: CollectionProgress; // 阶段 3 新增，见 §3.10 图鉴部分
}
