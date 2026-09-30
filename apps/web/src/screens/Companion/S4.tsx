import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../engine/identity/useAuth";
import { useAccount, useWorkspace } from "../../engine/workspace/useAccount";
import { usePet } from "../../engine/companion/usePet";
import { computeMoodTier } from "../../engine/companion/moodTier";
import {
  AUTO_FEEDER_COST_CREDITS,
  AUTO_FEEDER_DURATION_HOURS,
  effectiveHoursSinceFed,
  feedPet,
  isAutoFeederActive,
  purchaseAutoFeeder,
} from "../../engine/companion/feeding";
import { POINTS_RECALL_COST, recallWithPoints } from "../../engine/companion/wander";
import { loadAnchor } from "../../content-loader";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { StatChip } from "../../components/StatChip";
import { BackToHome } from "../../components/BackToHome";

const PET_EMOJI: Record<string, string> = { mochi: "🐹", brick: "🐱", sprout: "🐰" };

// 阶段 4（陪伴细化）主面板——对应 Figma F1/F2（收纳盒面板）+ S4b（出走预警）的
// 骨架版合并实现：投喂、自动喂食器、出走提示与找回入口，都放在这一个屏幕，
// 不像 Figma 那样拆成"收纳盒"+"睡觉预警"两张图，demo 阶段先合并成一屏更省事，
// 不影响后续要拆开时把这个屏幕里的三个 Card 分家。
export function S4Companion() {
  const { user } = useAuth();
  const { account } = useAccount(user?.uid);
  const { workspace } = useWorkspace(account?.current_workspace_id);
  const { pet } = usePet(account?.pet_id);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!account || !workspace || !pet) {
    return <p className="p-fig16">Loading...</p>;
  }

  const hoursSinceFed = effectiveHoursSinceFed(pet);
  const moodTier = computeMoodTier({ todayKwh: 0, collectionCount: 0, hoursSinceFed });
  const feederActive = isAutoFeederActive(pet);
  const wanderedAnchor = pet.wandered_anchor_id
    ? loadAnchor(workspace.content_pack_id, pet.wandered_anchor_id)
    : null;

  async function handleFeed() {
    setBusy(true);
    setMessage(null);
    await feedPet(account!.pet_id);
    setBusy(false);
    setMessage("Fed! Your pet feels better.");
  }

  async function handleBuyAutoFeeder() {
    setBusy(true);
    setMessage(null);
    const result = await purchaseAutoFeeder(account!.pet_id, workspace!.workspace_id, pet!);
    setBusy(false);
    setMessage(
      result === "ok"
        ? `Auto-feeder active for ${AUTO_FEEDER_DURATION_HOURS}h.`
        : "Not enough Credits for an auto-feeder."
    );
  }

  async function handleRecall() {
    setBusy(true);
    setMessage(null);
    const result = await recallWithPoints(pet!, account!.pet_id, workspace!.workspace_id);
    setBusy(false);
    setMessage(
      result === "ok"
        ? "Called back — but it's still a bit moody about being left alone."
        : result === "insufficient_points"
          ? "Not enough Points to call it back."
          : "It's already home."
    );
  }

  return (
    <div className="min-h-screen flex flex-col gap-fig16 p-fig16">
      <BackToHome />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Companion</h1>
        <div className="flex gap-fig12">
          <StatChip icon="★" value={workspace.points_balance} label="Points" />
          <StatChip icon="◇" value={workspace.credits_balance} label="Credits" />
        </div>
      </div>

      <Card className="text-center">
        <div className="text-5xl mb-fig12" aria-hidden>
          {pet.wandered_off ? "❓" : PET_EMOJI[pet.species]}
        </div>
        <p className="text-xs text-ink-soft">
          {pet.species} · mood: {pet.wandered_off ? "away" : moodTier}
        </p>
        {feederActive && (
          <p className="text-xs text-ink-soft mt-1">
            🍽️ Auto-feeder active until {new Date(pet.auto_feeder_active_until!).toLocaleString()}
          </p>
        )}
      </Card>

      {message && <p className="text-xs text-accent-red">{message}</p>}

      {pet.wandered_off ? (
        <Card>
          <p className="text-sm font-semibold">Your pet wandered off!</p>
          <p className="text-xs text-ink-soft mt-1">
            {wanderedAnchor
              ? `It might be hiding near ${wanderedAnchor.display_name}. Scan that anchor to find it.`
              : "It's hiding somewhere in the park. Go look around, or call it back."}
          </p>
          <div className="mt-fig12 flex flex-col gap-fig12">
            {wanderedAnchor && (
              <Button
                variant="secondary"
                onClick={() => navigate(`/anchor/${wanderedAnchor.anchor_id}/detail`)}
              >
                Go find it →
              </Button>
            )}
            <Button
              disabled={busy || workspace.points_balance < POINTS_RECALL_COST}
              onClick={handleRecall}
            >
              Call back now ({POINTS_RECALL_COST} ★)
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <p className="text-sm font-semibold">Take care of your companion</p>
          <div className="mt-fig12 flex flex-col gap-fig12">
            <Button disabled={busy} onClick={handleFeed}>
              Feed now
            </Button>
            <Button
              variant="secondary"
              disabled={busy || feederActive || workspace.credits_balance < AUTO_FEEDER_COST_CREDITS}
              onClick={handleBuyAutoFeeder}
            >
              Buy auto-feeder ({AUTO_FEEDER_COST_CREDITS} ◇, {AUTO_FEEDER_DURATION_HOURS}h)
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <p className="text-sm font-semibold">Desk focus</p>
        <p className="text-xs text-ink-soft mt-1">
          A short focus session adds to your activity — walk with your companion without leaving your desk.
        </p>
        <div className="mt-fig12">
          <Button variant="accent" onClick={() => navigate("/focus")}>
            Start a focus session →
          </Button>
        </div>
      </Card>

      <Button variant="secondary" onClick={() => navigate("/")}>
        ← Back home
      </Button>
    </div>
  );
}
