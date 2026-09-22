import { useNavigate } from "react-router-dom";
import { useAuth } from "../../engine/identity/useAuth";
import { useAccount, useWorkspace } from "../../engine/workspace/useAccount";
import { usePet } from "../../engine/companion/usePet";
import { computeMoodTier } from "../../engine/companion/moodTier";
import { pickPetStatusSentence } from "../../engine/ai-translation/petStatusSentences";
import { loadAnchor, loadContentPack } from "../../content-loader";
import { StatChip } from "../../components/StatChip";
import { LiveBar } from "../../components/LiveBar";
import { Card } from "../../components/Card";

const PET_EMOJI: Record<string, string> = { mochi: "🐹", brick: "🐱", sprout: "🐰" };

// 对应 Figma S1（21:2）：地图 + 底部面板（场景切换、宠物 + AI 状态句、
// 园区播报、四模块入口、世界事件入口）。骨架阶段只做宠物状态 + 一个锚点入口，
// 其余模块入口先做占位（对应 build-plan 阶段 2–5 才会实现）。
export function S1Home() {
  const { user } = useAuth();
  const { account } = useAccount(user?.uid);
  const { workspace } = useWorkspace(account?.current_workspace_id);
  const { pet } = usePet(account?.pet_id);
  const navigate = useNavigate();

  const pack = workspace ? loadContentPack(workspace.content_pack_id) : null;
  const anchor = pack ? loadAnchor(workspace!.content_pack_id, "a1-solar-pole") : null;

  const hoursSinceFed = pet ? (Date.now() - pet.last_fed_at) / 3_600_000 : 999;
  const moodTier = computeMoodTier({
    todayKwh: anchor?.simulated_data.kwh_today ?? 0,
    collectionCount: 0,
    hoursSinceFed,
  });
  const statusSentence = pet ? pickPetStatusSentence(pet.species, moodTier) : "...";

  return (
    <div className="min-h-screen flex flex-col">
      {/* 主页背景等距地图占位 —— 真实素材待 Diasy 提供（G3），骨架阶段用色块代替 */}
      <div
        className="flex-1 flex flex-col items-center justify-center gap-fig12"
        style={{ background: "linear-gradient(180deg, #dfe7df 0%, #f4f4ee 60%)" }}
      >
        <div className="flex gap-fig12">
          <StatChip icon="⚡" value={account?.activity_score ?? 0} label="Activity" />
          <StatChip icon="★" value={workspace?.points_balance ?? 0} label="Points" />
          <StatChip icon="◇" value={workspace?.credits_balance ?? 0} label="Credits" />
        </div>

        <Card className="w-full max-w-sm mx-fig16 text-center">
          <div className="text-5xl mb-fig12" aria-hidden>
            {pet ? PET_EMOJI[pet.species] : "..."}
          </div>
          <p className="text-xs text-ink-soft mb-1">
            {pet ? pet.species : "loading"} · mood: {pet ? moodTier : "..."}
          </p>
          <p className="text-sm">{statusSentence}</p>
        </Card>
      </div>

      <div className="flex flex-col">
        <LiveBar onClick={() => navigate("/anchor/a1-solar-pole/scan")}>
          <span className="text-sm">🔴 Nearby anchor</span>
          <span className="text-sm">{anchor?.display_name ?? "Solar-Powered Lamp Post"} →</span>
        </LiveBar>
        <div className="grid grid-cols-4 bg-paper-raised border-t-2 border-ink-strong">
          {["Connect", "Build", "Collect", "Companion"].map((m) => (
            <div key={m} className="py-fig12 text-center text-xs text-ink-soft">
              {m}
              <div className="text-[10px]">(阶段 2+)</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
