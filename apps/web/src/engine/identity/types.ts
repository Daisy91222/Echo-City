// 对应 claude/echocity-prototype.md §3.1（身份层，引擎，全局）
export interface Account {
  account_id: string; // = Firebase Auth uid
  email: string;
  activity_score: number;
  current_scene_mode: "desk_focus" | "onsite";
  current_workspace_id: string;
  pet_id: string;
}
