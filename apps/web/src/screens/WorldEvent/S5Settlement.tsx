import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../engine/identity/useAuth";
import { useAccount, useWorkspace } from "../../engine/workspace/useAccount";
import { activeEventId } from "../../engine/world-event/hpCounter";
import { useAllParticipants, useMyParticipation, useWorldEvent } from "../../engine/world-event/useWorldEvent";
import { computeRewardShares, claimReward } from "../../engine/world-event/settlement";
import { BossHpBar } from "../../components/BossHpBar";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";

// 对应 Figma S5 · Settlement（67:412）：名次卡 + 奖励 + Top-50 伤害榜 + Claim rewards。
export function S5Settlement() {
  const { user } = useAuth();
  const { account } = useAccount(user?.uid);
  const { workspace } = useWorkspace(account?.current_workspace_id);
  const eventId = workspace ? activeEventId(workspace.content_pack_id) : undefined;
  const { event } = useWorldEvent(eventId);
  const { participants } = useAllParticipants(eventId);
  const { participation } = useMyParticipation(eventId, user?.uid);
  const navigate = useNavigate();
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  if (!event) return <p className="p-fig16">Loading...</p>;

  if (!event.settled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-fig16 p-fig16">
        <p className="text-sm text-ink-soft">This event hasn't been settled yet.</p>
        <Button onClick={() => navigate("/world-event/join")}>Back to event</Button>
      </div>
    );
  }

  const shares = computeRewardShares(participants, event.reward_pool_total);
  const mine = user ? shares.find((s) => s.participantId === user.uid) : undefined;
  const alreadyClaimed = participation?.reward_claimed || claimed;

  const handleClaim = async () => {
    if (!mine || !eventId || !user || !workspace) return;
    setClaiming(true);
    const ok = await claimReward(eventId, user.uid, workspace.workspace_id, mine.rewardAmount);
    setClaiming(false);
    if (ok) setClaimed(true);
  };

  return (
    <div className="min-h-screen flex flex-col p-fig16 gap-fig16">
      <h2 className="font-pixel text-lg text-center">Event Settled</h2>
      <BossHpBar current={event.boss_hp_remaining} total={event.boss_hp_total} />

      {mine && (
        <Card className="text-center">
          <p className="text-xs text-ink-soft">Your rank</p>
          <p className="text-2xl font-pixel">#{mine.rank}</p>
          <p className="text-sm mt-1">
            {mine.totalDamage} damage dealt · ◇ {mine.rewardAmount} reward
          </p>
          <Button
            className="w-full mt-fig16"
            disabled={claiming || alreadyClaimed || mine.rewardAmount <= 0}
            onClick={handleClaim}
          >
            {alreadyClaimed ? "Claimed" : claiming ? "Claiming..." : "Claim rewards"}
          </Button>
        </Card>
      )}

      <Card>
        <p className="text-xs text-ink-soft mb-fig12">Top-50 damage board</p>
        <div className="max-h-64 overflow-y-auto flex flex-col gap-1">
          {shares.slice(0, 50).map((s) => (
            <div
              key={s.participantId}
              className="flex justify-between text-xs py-1 border-b border-paper-line"
            >
              <span>
                #{s.rank} {s.participantId === user?.uid ? "(you)" : s.participantId.slice(0, 8)}
              </span>
              <span>
                {s.totalDamage} dmg · ◇{s.rewardAmount}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <button className="text-xs text-ink-soft underline" onClick={() => navigate("/")}>
        Back to home
      </button>
    </div>
  );
}
