import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../engine/identity/useAuth";
import { useAccount, useWorkspace } from "../../engine/workspace/useAccount";
import { loadAnchor } from "../../content-loader";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";

// 对应 Figma A2（42:363）：物件今日数据 + 故事章节（已解锁/阈值进度）+
// AI「今日回响」一句 + Check in。骨架阶段"今日回响"读的是内容包里的静态
// daily_greeting_text（目前是 null，见 anchors.json 注释——等 Claude API
// key 到位后由 scripts 脚本生成填入，不是现场调用）。
export function A2AnchorDetail() {
  const { anchorId } = useParams<{ anchorId: string }>();
  const { user } = useAuth();
  const { account } = useAccount(user?.uid);
  const { workspace } = useWorkspace(account?.current_workspace_id);
  const navigate = useNavigate();

  const anchor = workspace && anchorId ? loadAnchor(workspace.content_pack_id, anchorId) : null;

  if (!anchor) {
    return <p className="p-fig16">Loading...</p>;
  }

  return (
    <div className="min-h-screen flex flex-col gap-fig16 p-fig16">
      <h1 className="text-xl font-bold">{anchor.display_name}</h1>

      <Card>
        <p className="text-xs text-ink-soft mb-fig12">Today's readings (simulated)</p>
        <div className="flex gap-fig16">
          {Object.entries(anchor.simulated_data).map(([key, value]) => (
            <div key={key}>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-ink-soft">{key}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <p className="text-xs text-ink-soft mb-1">Today's echo (AI)</p>
        <p className="text-sm">
          {anchor.daily_greeting_text ?? "(占位——尚未生成，见 scripts/generate-daily-greeting.mjs)"}
        </p>
      </Card>

      <Card>
        <p className="text-xs text-ink-soft mb-fig12">Story chapters</p>
        {anchor.story_chapters.map((chapter) => {
          const currentValue = anchor.simulated_data[chapter.unlock_field] ?? 0;
          const unlocked = currentValue >= chapter.unlock_threshold;
          return (
            <div key={chapter.chapter_id} className="mb-fig12 last:mb-0">
              <p className="text-sm font-semibold">
                {unlocked ? "🔓" : "🔒"} {chapter.title}
              </p>
              {unlocked ? (
                <p className="text-xs mt-1">{chapter.body_text}</p>
              ) : (
                <p className="text-xs text-ink-soft mt-1">
                  Unlocks at {chapter.unlock_field} ≥ {chapter.unlock_threshold} (now {currentValue})
                </p>
              )}
            </div>
          );
        })}
      </Card>

      <Button onClick={() => navigate("/")}>Check in here</Button>
    </div>
  );
}
