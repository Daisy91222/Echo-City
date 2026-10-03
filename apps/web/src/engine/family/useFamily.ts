import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { db } from "../identity/firebase";
import type { Account } from "../identity/types";
import type { MemberSlot } from "./types";

// 订阅单个成员位节点——member_slots 顶层没有开 .read（见 identity/types.ts 里
// member_slot_ids 字段的注释），只能按 id 逐个订阅，不能整表查询。
export function useMemberSlot(memberId: string | null | undefined) {
  const [member, setMember] = useState<MemberSlot | null>(null);
  const [loading, setLoading] = useState(!!memberId);

  useEffect(() => {
    if (!memberId) {
      setMember(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    return onValue(ref(db, `member_slots/${memberId}`), (snap) => {
      setMember(snap.exists() ? (snap.val() as MemberSlot) : null);
      setLoading(false);
    });
  }, [memberId]);

  return { member, loading };
}

// 按 account.member_slot_ids 逐个订阅，拼成一个列表。member_slot_ids 变化时
// （新建成员位）会自动补订阅新的 id，不需要手动刷新。
export function useMemberSlots(account: Account | null) {
  const ids = account?.member_slot_ids ? Object.keys(account.member_slot_ids) : [];
  // 用 join 后的字符串而不是数组本身做依赖项——数组每次渲染都是新引用，
  // 会导致 effect 无限重订阅
  const idsKey = ids.join(",");
  const [members, setMembers] = useState<Record<string, MemberSlot>>({});
  const [loading, setLoading] = useState(ids.length > 0);

  useEffect(() => {
    if (ids.length === 0) {
      setMembers({});
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubs = ids.map((id) =>
      onValue(ref(db, `member_slots/${id}`), (snap) => {
        setMembers((prev) => {
          const next = { ...prev };
          if (snap.exists()) {
            next[id] = snap.val() as MemberSlot;
          } else {
            delete next[id];
          }
          return next;
        });
        setLoading(false);
      })
    );
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  return { members: Object.values(members), loading };
}
