// 对应 §3.8（商户与核销）+ §3.10 图鉴/收集度部分。
// collection_progress 存在 workspace 节点下（§3.2），这里只定字段形状，不新建独立表——
// 用 map（chapter_id -> true）而不是数组，是为了让"某一章是否已收集"能用一次
// runTransaction 原子判断+写入，不需要先读整个数组再判断 includes()（见 collection.ts）。
export interface CollectionProgress {
  unlocked_chapter_ids?: Record<string, true>;
}

export interface Merchant {
  merchant_id: string;
  content_pack_id: string;
  display_name: string;
  discount_config: {
    type: "percent" | "flat" | "free_item";
    value: number;
    credits_cost: number;
    description: string;
  };
}

// 对应 §3.8 redemption_records。qr_token 这次 demo 里直接等于 redemption_id 本身
// ——没有做真正的二维码编码/扫描识别，玩家把这段文字/编号"出示"给商户端页面，
// 商户端页面直接按这个 id 查记录（见 redemption.ts 注释里对这处简化的完整说明）。
export interface RedemptionRecord {
  redemption_id: string;
  workspace_id: string;
  merchant_id: string;
  credits_spent: number;
  qr_token: string;
  redeemed_at: number | null;
  created_at: number;
}
