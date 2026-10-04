import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../engine/identity/useAuth";
import { useAccount, useWorkspace } from "../../engine/workspace/useAccount";
import { switchToWorkspace } from "../../engine/workspace/workspaceSwitch";
import { useMemberSlots } from "../../engine/family/useFamily";
import { createMemberSlot, switchActiveMember, MAX_MEMBER_SLOTS } from "../../engine/family/memberSwitch";
import { completeTaskCard, useKidTaskCompletions } from "../../engine/family/kidTasks";
import type { AgeBand } from "../../engine/family/types";
import { listAvailableContentPacks, listKidTaskCards } from "../../content-loader";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { BackToHome } from "../../components/BackToHome";

// 对应 Figma L3（33:316）：原来只是"选园区工作区"。2026-10-03 按 Diasy 的指示
// 扩展成更通用的 Switch Account 页面——主要功能仍然是切工作区（逻辑不变，
// 下面 handleEnterWorkspace 原样保留），新增的是"切身份"：监护人本人 或
// 某个家庭成员位。这是目前唯一一个能管理/切换家庭成员位的入口，也是家庭成员位
// 这个功能缺口（之前完全没有代码）落地的地方。
export function L3SwitchAccount() {
  const { user } = useAuth();
  const { account, loading } = useAccount(user?.uid);
  const { workspace } = useWorkspace(account?.current_workspace_id);
  const { members } = useMemberSlots(account);
  const packs = listAvailableContentPacks();
  const navigate = useNavigate();

  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [addingMember, setAddingMember] = useState(false);
  const [newNickname, setNewNickname] = useState("");
  const [newAgeBand, setNewAgeBand] = useState<AgeBand>("child_grade1_2");
  const [memberError, setMemberError] = useState<string | null>(null);
  const [savingMember, setSavingMember] = useState(false);
  const [identityError, setIdentityError] = useState<string | null>(null);

  const activeMemberId = account?.current_member_id ?? null;
  const { completions } = useKidTaskCompletions(activeMemberId);
  const taskCards = workspace ? listKidTaskCards(workspace.content_pack_id) : [];
  const [completing, setCompleting] = useState<string | null>(null);

  if (loading) return <p className="p-fig16">Loading...</p>;

  async function handleEnterWorkspace(contentPackId: string) {
    if (!user) return;
    setError(null);
    setSwitchingId(contentPackId);
    try {
      await switchToWorkspace(user.uid, contentPackId);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSwitchingId(null);
    }
  }

  async function handleSwitchIdentity(memberId: string | null) {
    // 2026-10-04 修复（Diasy 反馈"点新建的成员位没反应"）：原来没有 try/catch，
    // 写入失败会静默；选中态也只靠一圈边框颜色，几乎看不出变化，任务卡又渲染在
    // 页面最底部（折叠线以下），点了之后肉眼看不到任何变化。
    if (!user) return;
    setIdentityError(null);
    try {
      await switchActiveMember(user.uid, memberId);
    } catch (err) {
      setIdentityError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleAddMember() {
    // 2026-10-03 修复：原来这里"没填昵称就直接 return"是静默失败——点 Save
    // 什么反应都没有（Diasy 反馈"点了没反应"正是这个表现）。改成明确报错，
    // 并且把 createMemberSlot 包进 try/catch（这之前也没有，万一真的写入失败
    // ——比如规则还没在 Firebase 控制台重新 Publish——同样会表现成"点了没反应"，
    // 跟 handleEnterWorkspace 已经在用的错误展示方式保持一致）。
    if (!user) return;
    if (!newNickname.trim()) {
      setMemberError("Nickname can't be empty.");
      return;
    }
    if (members.length >= MAX_MEMBER_SLOTS) {
      setMemberError(`Up to ${MAX_MEMBER_SLOTS} family members per account.`);
      return;
    }
    setMemberError(null);
    setSavingMember(true);
    try {
      await createMemberSlot(user.uid, {
        nickname: newNickname.trim(),
        avatar: "🧒",
        age_band: newAgeBand,
      });
      setNewNickname("");
      setAddingMember(false);
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingMember(false);
    }
  }

  async function handleCompleteCard(cardId: string, pointsReward: number, activityReward: number) {
    if (!activeMemberId) return;
    setCompleting(cardId);
    await completeTaskCard(activeMemberId, {
      card_id: cardId,
      points_reward: pointsReward,
      activity_reward: activityReward,
    });
    setCompleting(null);
  }

  return (
    <div className="min-h-screen flex flex-col items-center gap-fig16 px-fig16 py-fig16">
      <BackToHome />

      <h1 className="text-2xl font-bold">Switch account</h1>

      <div className="flex flex-col gap-fig12 w-full max-w-sm">
        <p className="text-xs text-ink-soft uppercase tracking-wide">Workspace</p>
        {packs.map((pack) => (
          <Card key={pack.content_pack_id}>
            <p className="font-semibold">{pack.display_name}</p>
            <p className="text-xs text-ink-soft mb-fig12">
              {pack.zones.length} zones · content pack: {pack.content_pack_id}
            </p>
            <Button
              disabled={!account || switchingId !== null}
              onClick={() => handleEnterWorkspace(pack.content_pack_id)}
              className="w-full"
            >
              {switchingId === pack.content_pack_id ? "Switching..." : "Enter"}
            </Button>
          </Card>
        ))}
        {error && <p className="text-accent-red text-xs text-center">{error}</p>}
      </div>

      <div className="flex flex-col gap-fig12 w-full max-w-sm">
        <p className="text-xs text-ink-soft uppercase tracking-wide mt-fig12">
          Who's playing? (family members)
        </p>

        <Card
          className={`cursor-pointer ${activeMemberId === null ? "border-accent-orange bg-accent-sand" : ""}`}
          onClick={() => handleSwitchIdentity(null)}
        >
          <p className="font-semibold">
            You (guardian)
            {activeMemberId === null && (
              <span className="ml-fig8 text-xs text-accent-red">● Playing now</span>
            )}
          </p>
          <p className="text-xs text-ink-soft">{account?.email}</p>
        </Card>

        {members.map((m) => {
          const isActive = activeMemberId === m.member_id;
          return (
            <div key={m.member_id} className="flex flex-col gap-fig12">
              <Card
                className={`cursor-pointer ${isActive ? "border-accent-orange bg-accent-sand" : ""}`}
                onClick={() => handleSwitchIdentity(m.member_id)}
              >
                <p className="font-semibold">
                  {m.avatar} {m.nickname}
                  {isActive && <span className="ml-fig8 text-xs text-accent-red">● Playing now</span>}
                </p>
                <p className="text-xs text-ink-soft">
                  {m.age_band} · ★ {m.points_balance} · activity {m.activity_score}
                </p>
              </Card>
              {isActive && (
                <div className="flex flex-col gap-fig12 pl-fig12">
                  <p className="text-xs text-ink-soft uppercase tracking-wide">
                    {m.nickname}'s task cards
                  </p>
                  {taskCards.length === 0 && (
                    <p className="text-xs text-ink-soft">No task cards for this workspace yet.</p>
                  )}
                  {taskCards.map((card) => {
                    const done = !!completions[card.card_id];
                    return (
                      <Card key={card.card_id}>
                        <p className="text-sm">{card.custom_text}</p>
                        <p className="text-xs text-ink-soft mb-fig12">
                          ★ {card.points_reward} · activity {card.activity_reward}
                        </p>
                        <Button
                          variant={done ? "secondary" : "primary"}
                          disabled={done || completing === card.card_id}
                          className="w-full"
                          onClick={() =>
                            handleCompleteCard(card.card_id, card.points_reward, card.activity_reward)
                          }
                        >
                          {done
                            ? "✓ Completed"
                            : completing === card.card_id
                              ? "Confirming..."
                              : "Confirm completed"}
                        </Button>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {identityError && <p className="text-accent-red text-xs">{identityError}</p>}

        {!addingMember ? (
          <Button variant="secondary" className="w-full" onClick={() => setAddingMember(true)}>
            + Add family member
          </Button>
        ) : (
          <Card>
            <input
              className="w-full border-2 border-ink-strong rounded-md p-fig12 mb-fig12 text-sm"
              placeholder="Nickname"
              value={newNickname}
              onChange={(e) => setNewNickname(e.target.value)}
            />
            <select
              className="w-full border-2 border-ink-strong rounded-md p-fig12 mb-fig12 text-sm"
              value={newAgeBand}
              onChange={(e) => setNewAgeBand(e.target.value as AgeBand)}
            >
              <option value="child_grade1_2">Grade 1–2</option>
              <option value="child_grade3_4">Grade 3–4</option>
              <option value="child_grade5_6">Grade 5–6</option>
            </select>
            {memberError && <p className="text-accent-red text-xs mb-fig12">{memberError}</p>}
            <div className="flex gap-fig12">
              <Button className="flex-1" disabled={savingMember} onClick={handleAddMember}>
                {savingMember ? "Saving..." : "Save"}
              </Button>
              <Button variant="secondary" className="flex-1" onClick={() => setAddingMember(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        )}
      </div>

      <p className="text-xs text-ink-soft mt-fig12">One engine · one content pack per site</p>
    </div>
  );
}
