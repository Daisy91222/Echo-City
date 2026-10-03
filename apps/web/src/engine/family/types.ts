// 对应 claude/echocity-prototype.md §3.1（member_slot）与 §3.9（儿童任务卡）。
// 2026-10-03 新增：此前 engine/ 下完全没有家庭成员位相关代码——database.rules.json
// 里 member_slots / kid_task_templates / kid_task_cards / kid_task_completions
// 这几个节点的权限规则早就写好了（阶段 0 建库时就按 §3.10 配好的），但从阶段 1
// 到阶段 5 一直没有代码真正读写过，是本次补齐的功能缺口之一。

export type AgeBand = "child_grade1_2" | "child_grade3_4" | "child_grade5_6";

export interface MemberSlot {
  member_id: string;
  account_id: string;
  nickname: string;
  avatar: string;
  age_band: AgeBand;
  activity_score: number;
  points_balance: number;
  // task_log 是 kid_task_completions/{member_id} 的只读投影（schema §9 原文），
  // demo 阶段直接订阅 kid_task_completions/{member_id} 本身即可，不在 member_slot
  // 对象上单独维护一份，避免两份数据打架——这里的字段类型只是占位，不会被写入。
  task_log?: Record<string, KidTaskCompletion>;
}

// 儿童任务卡模板：引擎共享（§2 表"儿童任务卡库（基础）"）。按 build-plan 的
// "内容包是数据不是代码"原则，不走 Firebase（kid_task_templates 节点的写权限
// 锁给了运营专员，demo 里没有运营专员账号，实际上写不进去），改成静态 JSON，
// 和 anchors/merchants 走同一套 content-loader 机制——这和 Firebase
// database.rules.json 里 content_packs/anchors 两个节点长期没被代码使用、
// 实际数据都在静态文件里是同一种"规则文件先写好、落地时发现更适合做成静态
// 内容包数据"的情况，不是新引入的不一致。
export interface KidTaskTemplate {
  template_id: string;
  text_template: string;
  age_band_tag: AgeBand;
}

// 儿童任务卡：内容包专属（§2 表），同样走静态 JSON（content-packs/<pack>/kid-task-cards.json）
export interface KidTaskCard {
  card_id: string;
  content_pack_id: string;
  template_id?: string; // 引用共享模板
  custom_text?: string; // 或者直接给专属文案，二者至少有一个
  points_reward: number;
  activity_reward: number;
}

// 完成记录：这才是真正需要落 Firebase 的动态数据（谁完成了哪张卡、什么时候）
export interface KidTaskCompletion {
  card_id: string;
  completed_at: number;
  guardian_confirmed_at: number;
}
