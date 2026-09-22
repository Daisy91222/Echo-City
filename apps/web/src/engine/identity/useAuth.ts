import { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { ref, set } from "firebase/database";
import { auth, db } from "./firebase";
import type { Account } from "./types";
import type { PetSpecies } from "../companion/types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  return { user, loading };
}

export async function signIn(email: string, password: string) {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function signOutUser() {
  await firebaseSignOut(auth);
}

// 注册 + 建号：一次性创建 pet / workspace / account 三个节点。
// 三个写各自独立满足 database.rules.json 的 owner-write 规则（account_id === auth.uid），
// 不是一次原子事务——demo 阶段够用，真正的多节点一致性保证留给后续阶段。
export async function registerAndBootstrap(
  email: string,
  password: string,
  species: PetSpecies,
  contentPackId: string
): Promise<{ uid: string; petId: string; workspaceId: string }> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;

  const petId = `${uid}-pet`;
  const workspaceId = `${uid}-${contentPackId}`;

  // pets/$pet_id：不写 mood_tier —— rules 里这个字段客户端零写权限，
  // 真实产品里由每日 cron（Admin SDK）写，demo 阶段前端只读、现算现展示，不持久化
  await set(ref(db, `pets/${petId}`), {
    account_id: uid,
    species,
    last_fed_at: Date.now(),
    wandered_off: false,
  });

  // workspaces/$workspace_id：不写 points_daily_cap —— 只有平台维护团队能改，
  // demo 阶段留空，等运营后台阶段（阶段 5）再由该角色在控制台设置
  await set(ref(db, `workspaces/${workspaceId}`), {
    account_id: uid,
    content_pack_id: contentPackId,
    points_balance: 0,
    credits_balance: 0,
  });

  const account: Account = {
    account_id: uid,
    email,
    activity_score: 0,
    current_scene_mode: "onsite",
    current_workspace_id: workspaceId,
    pet_id: petId,
  };
  await set(ref(db, `accounts/${uid}`), account);

  return { uid, petId, workspaceId };
}
