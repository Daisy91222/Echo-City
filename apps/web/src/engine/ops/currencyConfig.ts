import { onValue, ref, update } from "firebase/database";
import { useEffect, useState } from "react";
import { db } from "../identity/firebase";
import type { CurrencyChannelConfig } from "./types";

// §3.10 矩阵原文：currency_channel_config 平台维护团队读写，运营专员只读，
// 宣传部门无权限。这个 hook 对所有登录用户都尝试读；没有 staff_roles 记录的
// 普通玩家账号，或者只有 publicity 角色的账号，会在这里真实拿到 Firebase 的
// PERMISSION_DENIED——这不是 bug，是这条读权限规则本身在起作用，onError 回调
// 把错误原样暴露出来，不吞掉。
export function useCurrencyChannels() {
  const [channels, setChannels] = useState<Record<string, CurrencyChannelConfig>>({});
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = onValue(
      ref(db, "currency_channel_config"),
      (snap) => {
        setChannels(snap.exists() ? (snap.val() as Record<string, CurrencyChannelConfig>) : {});
        setReadError(null);
        setLoading(false);
      },
      (err) => {
        setReadError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  return { channels, loading, readError };
}

// 平台维护团队专属写：新建/编辑一条渠道配置。rules 对应
// currency_channel_config.write = platform_maintainer only（§3.10）——
// 运营专员账号调用这个函数会得到一个真实的 PERMISSION_DENIED Error，
// 调用方（O1.tsx）负责 catch 住并把错误文本原样展示出来。
export async function saveCurrencyChannel(config: CurrencyChannelConfig): Promise<void> {
  await update(ref(db, `currency_channel_config/${config.channel_id}`), { ...config });
}

// 平台维护团队专属写：改当前工作区的 Points 日上限（§3.2 points_daily_cap 🔧，
// 这条规则从阶段 0 起就已经存在于 database.rules.json，一直没有界面用过）。
export async function savePointsDailyCap(workspaceId: string, capValue: number): Promise<void> {
  await update(ref(db, `workspaces/${workspaceId}`), { points_daily_cap: capValue });
}
