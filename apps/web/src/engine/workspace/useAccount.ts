import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db } from "../identity/firebase";
import type { Account } from "../identity/types";
import type { Workspace } from "./types";

// 读账号记录（含 current_workspace_id / pet_id 这两个跨层引用字段，
// 对应 build-plan「外键关联换成手动维护的引用字段」这条翻译原则）
export function useAccount(uid: string | undefined) {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setAccount(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    return onValue(ref(db, `accounts/${uid}`), (snap) => {
      setAccount(snap.exists() ? (snap.val() as Account) : null);
      setLoading(false);
    });
  }, [uid]);

  return { account, loading };
}

export function useWorkspace(workspaceId: string | undefined) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) {
      setWorkspace(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    return onValue(ref(db, `workspaces/${workspaceId}`), (snap) => {
      setWorkspace(snap.exists() ? (snap.val() as Workspace) : null);
      setLoading(false);
    });
  }, [workspaceId]);

  return { workspace, loading };
}
