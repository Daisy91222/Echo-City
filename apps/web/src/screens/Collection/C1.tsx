import { useNavigate } from "react-router-dom";
import { useAuth } from "../../engine/identity/useAuth";
import { useAccount, useWorkspace } from "../../engine/workspace/useAccount";
import { listAnchors } from "../../content-loader";
import { allChaptersSorted, isChapterUnlocked } from "../../engine/collection/collection";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { StatChip } from "../../components/StatChip";
import { BackToHome } from "../../components/BackToHome";

// 对应 Figma C1（图鉴/收集页）：五个锚点各一章故事，按 order_index 排列，
// 已收集（章节已解锁 + 在 workspace.collection_progress 里记过一次性 Points）
// 和"已解锁但还没在这台设备上打开过详情页领取"是两种略有不同的状态——demo 阶段
// 不细分展示，图鉴页只看"阈值本身是否达到"（isChapterUnlocked），Points 有没有
// 实际到账由 A2 详情页负责（claimChapterCollectible 是幂等的，先看图鉴再去点开
// 对应锚点，Points 一样会补发）。
export function C1Collection() {
  const { user } = useAuth();
  const { account } = useAccount(user?.uid);
  const { workspace } = useWorkspace(account?.current_workspace_id);
  const navigate = useNavigate();

  if (!workspace) {
    return <p className="p-fig16">Loading...</p>;
  }

  const anchors = listAnchors(workspace.content_pack_id);
  const entries = allChaptersSorted(anchors);
  const unlockedCount = entries.filter(({ anchor, chapter }) => isChapterUnlocked(anchor, chapter)).length;

  return (
    <div className="min-h-screen flex flex-col gap-fig16 p-fig16">
      <BackToHome />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Collection</h1>
        <div className="flex gap-fig12">
          <StatChip icon="★" value={workspace.points_balance} label="Points" />
          <StatChip icon="◇" value={workspace.credits_balance} label="Credits" />
        </div>
      </div>

      <Card>
        <p className="text-sm font-semibold">
          {unlockedCount} / {entries.length} chapters collected
        </p>
        <p className="text-xs text-ink-soft mt-1">
          Visit an anchor and its real-time reading crosses the threshold to unlock its chapter.
        </p>
      </Card>

      <div className="flex flex-col gap-fig12">
        {entries.map(({ anchor, chapter }) => {
          const unlocked = isChapterUnlocked(anchor, chapter);
          return (
            <Card
              key={chapter.chapter_id}
              className={unlocked ? "cursor-pointer" : "opacity-60"}
              // 用原生 onClick 而不是给 Card 加 prop —— Card 组件目前不接受 onClick，
              // 阶段 3 不为了这一个用途改组件签名，直接包一层可点击区域即可
            >
              <button
                type="button"
                className="w-full text-left"
                disabled={!unlocked}
                onClick={() => navigate(`/anchor/${anchor.anchor_id}/detail`)}
              >
                <p className="text-sm font-semibold">
                  {unlocked ? "🔓" : "🔒"} Ch.{chapter.order_index} {chapter.title}
                </p>
                <p className="text-xs text-ink-soft mt-1">{anchor.display_name}</p>
              </button>
            </Card>
          );
        })}
      </div>

      <Button variant="secondary" onClick={() => navigate("/redeem")}>
        Redeem Credits →
      </Button>
      <Button variant="secondary" onClick={() => navigate("/")}>
        ← Back to map
      </Button>
    </div>
  );
}
