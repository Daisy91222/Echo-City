// 对应 claude/echocity-prototype.md §3.1（身份层，引擎，全局）
export interface Account {
  account_id: string; // = Firebase Auth uid
  email: string;
  activity_score: number;
  current_scene_mode: "desk_focus" | "onsite";
  current_workspace_id: string;
  pet_id: string;
  // 2026-10-03 家庭成员位功能新增（§3.1 member_slot 落地）。两个字段都是可选，
  // 不进 database.rules.json 的 accounts.$account_id.".validate" 必填列表——
  // 那条 validate 只 hasChildren() 检查几个一直都有的必填字段，不禁止账号节点
  // 上再挂别的字段，所以这两个新字段不需要改 rules 就能直接用。
  //
  // current_member_id：当前"以谁的身份在玩"。null/undefined = 监护人本人；
  // 否则是 member_slots 的某个 key。这是纯 UI 层的身份切换标记，不是认证边界——
  // demo 里孩子不单独持有账号（L-4.0），实际认证主体永远是监护人的 auth.uid，
  // 切换只是决定界面现在显示谁的任务卡/余额。
  current_member_id?: string | null;
  // member_slot_ids：account_id → member_id 的反向索引，用稀疏 map（跟
  // workspace.collection_progress 一样的写法）而不是数组，方便增删单个成员位时
  // 只改一个 key，不用先读整个数组再拼接。之所以需要这个索引，是因为
  // member_slots 顶层节点本身没有开 ".read"（只在 $member_id 这一层按
  // account_id 校验），RTDB 的 query（orderByChild('account_id')）在顶层
  // 没有 .read 的情况下会被直接拒绝、不会按子节点规则做部分过滤——这是 RTDB
  // 规则一个有名的坑（规则不是过滤器），所以不能指望"查询出我账号下所有成员位"，
  // 只能反向索引 + 按 id 逐个单独读取，每次读取都能命中各自那条已经开好的
  // 按 account_id 校验的 .read 规则。
  member_slot_ids?: Record<string, true>;
}
