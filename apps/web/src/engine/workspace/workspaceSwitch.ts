import { get, ref, set, update } from "firebase/database";
import { db } from "../identity/firebase";

// 阶段 5 新增。发现过程：L3（选工作区）这个屏幕从阶段 1 骨架起就只是 UI 占位——
// "Enter" 按钮不管点了哪张卡都直接 navigate("/")，account.current_workspace_id
// 从未被真正切换过。骨架阶段唯一内容包只有 riverside-yard，注册时已经绑定了这
// 唯一一个工作区，所以这个缺口一直没有被真正踩到。阶段 5 引入第二个内容包
// the-room 后，这条"能不能真的切换工作区"的路径第一次被真正需要，所以在这里
// 补上——这是完成阶段 1 遗留下的引擎能力缺口，不是为 the-room 这个内容包单独定制
// 的逻辑，同一套函数对任何未来新增的内容包都成立。已如实记入 build-plan.md，
// 不算违反"接入新内容包只加数据文件"这条原则（那条原则针对的是内容包数据本身，
// 不是这类通用引擎基础设施）。
//
// workspace_id 沿用 registerAndBootstrap()（useAuth.ts）已经定下的确定性命名规则
// `${uid}-${contentPackId}`，不需要新增任何"账号下有哪些工作区"的索引字段，就能
// 推出"这个账号在这个内容包下的工作区 id 是什么"。

export function deriveWorkspaceId(uid: string, contentPackId: string): string {
  return `${uid}-${contentPackId}`;
}

// 若该账号在这个内容包下还没有工作区，按 registerAndBootstrap() 同样的初始值创建一个
// （points_balance/credits_balance 从 0 开始，points_daily_cap 留空——同注册时一样，
// 等平台维护团队通过运营后台/控制台设置）；已存在则直接返回，不重复创建、不覆盖余额。
export async function ensureWorkspaceForPack(
  uid: string,
  contentPackId: string
): Promise<string> {
  const workspaceId = deriveWorkspaceId(uid, contentPackId);
  const wsRef = ref(db, `workspaces/${workspaceId}`);
  const snap = await get(wsRef);
  if (!snap.exists()) {
    await set(wsRef, {
      account_id: uid,
      content_pack_id: contentPackId,
      points_balance: 0,
      credits_balance: 0,
    });
  }
  return workspaceId;
}

// 供 L3（选工作区）调用：确保目标工作区存在，并把账号的 current_workspace_id
// 切过去——这一步之后 S1 主页、Companion、World Event、Collection/Redemption
// 四个模块读到的 workspace.content_pack_id 就会是新选的这个内容包。
export async function switchToWorkspace(
  uid: string,
  contentPackId: string
): Promise<string> {
  const workspaceId = await ensureWorkspaceForPack(uid, contentPackId);
  await update(ref(db, `accounts/${uid}`), { current_workspace_id: workspaceId });
  return workspaceId;
}
