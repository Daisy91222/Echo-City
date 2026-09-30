import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../engine/identity/useAuth";
import { useAccount, useWorkspace } from "../../engine/workspace/useAccount";
import { usePet } from "../../engine/companion/usePet";
import { computeMoodTier } from "../../engine/companion/moodTier";
import { effectiveHoursSinceFed } from "../../engine/companion/feeding";
import { checkAndTriggerWander } from "../../engine/companion/wander";
import { pickPetStatusSentence } from "../../engine/ai-translation/petStatusSentences";
import { listAnchors } from "../../content-loader";
import { StatChip } from "../../components/StatChip";
import { LiveBar } from "../../components/LiveBar";
import { Card } from "../../components/Card";
import { MapBackground } from "../../components/MapBackground";

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

  // 阶段 5 修复：此前硬编码 "a1-solar-pole"（riverside-yard 专属锚点 id），切到
  // the-room 工作区后这里会 loadAnchor(...) 拿到 null——不会崩溃，但会显示错误的
  // 兜底文案且"最近锚点"入口点进去是个不存在的锚点。改为取当前内容包的第一个锚点，
  // 对任何内容包都成立，不是 the-room 专属特判。
  const featuredAnchor = workspace ? listAnchors(workspace.content_pack_id)[0] ?? null : null;
  const anchor = featuredAnchor;

  // 阶段 4：有效投喂间隔改用 effectiveHoursSinceFed（自动喂食器生效时折算为 0），
  // 不再直接算 last_fed_at 距今——两处（S1 主页、Companion 面板）共用同一个函数，
  // 避免各自重复实现"自动喂食器生效期间当作刚喂过"这条规则。
  const hoursSinceFed = pet ? effectiveHoursSinceFed(pet) : 999;
  const moodTier = computeMoodTier({
    todayKwh: anchor?.simulated_data.kwh_today ?? 0,
    collectionCount: 0,
    hoursSinceFed,
  });
  const statusSentence = pet
    ? pickPetStatusSentence(pet.species, moodTier, workspace?.content_pack_id)
    : "...";

  // 出走判定放在主页加载时检查——这是用户几乎每次打开 App 都会经过的屏幕，
  // 不需要为此单独起一个后台任务或 cron。事务本身是幂等守卫（见 wander.ts），
  // 重复触发这个 effect（比如切换工作区再切回来）不会重复判定/重复选锚点。
  useEffect(() => {
    if (!pet || !workspace || !account) return;
    void checkAndTriggerWander(pet, account.pet_id, workspace.content_pack_id);
  }, [pet, workspace, account]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* 主页背景等距地图占位 —— 真实素材待 Diasy 提供（G3），骨架阶段用 SVG 色块代替，
          但视觉上已经是"一张地图"而不是空白渐变 + 悬浮宠物头像 */}
      <div className="relative flex-1 flex flex-col items-center justify-center gap-fig12 overflow-hidden">
        <MapBackground />

        {/* Diasy 反馈：卡片缩小至 70%、状态条挪到卡片正上方、两者要"关系合理"——
            之前的问题是 scale 只加在 Card 自己身上：Card 的盒子在布局时仍然占
            着缩放前的整块空间，视觉上缩小的内容悬在这块空间中间，和上面没缩放
            的状态条之间就会多出一截不成比例的空白。这次把 scale 挪到包住"状态条
            + 卡片"两者的外层容器上，两者作为一个整体一起缩放，间距比例才是对的。 */}
        <div className="relative z-10 flex flex-col items-center gap-fig8 scale-[0.7]">
          <div className="flex gap-fig12">
            <StatChip icon="⚡" value={account?.activity_score ?? 0} label="Activity" />
            <StatChip icon="★" value={workspace?.points_balance ?? 0} label="Points" />
            <StatChip icon="◇" value={workspace?.credits_balance ?? 0} label="Credits" />
          </div>

          {/* 卡片纵向拉长一点（min-h + 内容用 justify-center 垂直居中），
              不再单独缩放，缩放交给上面的外层容器统一处理 */}
          <Card className="w-full max-w-sm mx-fig16 text-center min-h-[22rem] flex flex-col justify-center">
            <div className="text-5xl mb-fig12" aria-hidden>
              {pet?.wandered_off ? "❓" : pet ? PET_EMOJI[pet.species] : "..."}
            </div>
            <p className="text-xs text-ink-soft mb-1">
              {pet ? pet.species : "loading"} · mood: {pet?.wandered_off ? "away" : pet ? moodTier : "..."}
            </p>
            <p className="text-sm">
              {pet?.wandered_off ? "Your companion wandered off — check Companion to find it." : statusSentence}
            </p>
          </Card>
        </div>
      </div>

      <div className="flex flex-col">
        <LiveBar onClick={() => navigate("/world-event/join")}>
          <span className="text-sm">🐉 World Event</span>
          <span className="text-sm">A boss has appeared →</span>
        </LiveBar>
        <LiveBar
          onClick={() => anchor && navigate(`/anchor/${anchor.anchor_id}/scan`)}
        >
          <span className="text-sm">🔴 Nearby anchor</span>
          <span className="text-sm">{anchor?.display_name ?? "..."} →</span>
        </LiveBar>
        <div className="grid grid-cols-4 bg-paper-raised border-t-2 border-ink-strong">
          <div className="py-fig12 text-center text-xs text-ink-soft">
            Connect
            <div className="text-[10px]">(阶段 4+)</div>
          </div>
          <div className="py-fig12 text-center text-xs text-ink-soft">
            Build
            <div className="text-[10px]">(不进 demo)</div>
          </div>
          {/* 阶段 3 落地：Collect 从占位改为真实入口，位置保持在原来第三格，
              其余三个模块仍是占位（Build 按 §1 C1 不进 demo，Connect/Companion 待后续阶段） */}
          <button
            type="button"
            className="py-fig12 text-center text-xs text-ink-strong font-semibold"
            onClick={() => navigate("/collection")}
          >
            Collect
            <div className="text-[10px] text-ink-soft font-normal">→</div>
          </button>
          {/* 阶段 4 落地：Companion 从占位改为真实入口 */}
          <button
            type="button"
            className="py-fig12 text-center text-xs text-ink-strong font-semibold"
            onClick={() => navigate("/companion")}
          >
            Companion
            <div className="text-[10px] text-ink-soft font-normal">→</div>
          </button>
        </div>

        {/* 阶段 5 新增：此前注册后没有任何入口能回到 /select-workspace——
            L2 只在注册那一刻导航过去一次。没有这一行，账号会永远困在
            riverside-yard 工作区，阶段 5"切换到 the-room 工作区"这条 DoD
            没有真实可点的路径可以验证。/ops 是运营后台草图的入口，标注
            "staff only"是文案层面的提示，不是真正的权限门（真正权限见 §3.10
            规则，由 Firebase 服务端判断，不是这个链接可不可见）。 */}
        <div className="flex justify-between px-fig16 py-fig8 bg-paper-raised border-t border-paper-line text-[10px] text-ink-soft">
          <button type="button" className="underline" onClick={() => navigate("/select-workspace")}>
            Switch workspace
          </button>
          <button type="button" className="underline" onClick={() => navigate("/ops")}>
            Ops backend (staff only)
          </button>
        </div>
      </div>
    </div>
  );
}
