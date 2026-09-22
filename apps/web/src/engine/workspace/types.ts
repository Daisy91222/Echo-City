// 对应 §3.2（工作区层，引擎，按园区）
export interface Workspace {
  workspace_id: string;
  account_id: string;
  content_pack_id: string;
  points_balance: number;
  credits_balance: number;
  points_daily_cap?: number; // 🔧 只有平台维护团队能写，demo 阶段可能是 undefined
}
