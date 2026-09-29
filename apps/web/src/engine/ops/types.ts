// 对应 claude/echocity-prototype.md §3.5（货币配置）与 §3.10（角色权限矩阵）。
// 这个模块是阶段 5 新增——database.rules.json 里 currency_channel_config /
// merchants 等节点的完整权限矩阵从阶段 0 建库起就已经写好（见该文件 schema
// §5/§10 注释），但在阶段 5 之前没有任何界面真正读写过这些节点：staff_roles
// 对客户端零读写权限（只能通过 Firebase 控制台/Admin SDK 维护），运营后台
// 正是第一次真正用真实登录账号去触碰这些既有规则，验证"运营专员改不了 Credits
// 上限、但改得了商户折扣"这条 §1.9.1 分权设计到底成立不成立，而不是让它一直
// 停留在规则文件的注释里没人验证过。
export interface CurrencyChannelConfig {
  channel_id: string;
  currency: "credits" | "points";
  cap_type: "fixed_threshold" | "fixed_pool_total";
  cap_value: number;
  active: boolean;
}
