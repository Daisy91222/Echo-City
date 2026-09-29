import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../engine/identity/useAuth";
import { useAccount } from "../../engine/workspace/useAccount";
import { switchToWorkspace } from "../../engine/workspace/workspaceSwitch";
import { listAvailableContentPacks } from "../../content-loader";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";

// 对应 Figma L3（33:316）：选园区工作区 = 选内容包
// 页脚"一个引擎 · 每园区一个内容包"直接对应这个页面存在的产品架构理由
//
// 阶段 5 修复：这个屏幕从阶段 1 起"Enter"按钮就只是 navigate("/")，不管点了哪张卡，
// account.current_workspace_id 从未被真正切换过（骨架阶段只有一个内容包，
// 注册时已经绑定好了，这个缺口一直没被踩到）。现在真正调用 switchToWorkspace()
// 切换/创建工作区，再导航回主页——阶段 5 引入第二个内容包 the-room 后，这是
// 第一次真正验证"一个账号能在多个内容包之间切换"这条架构主张。
export function L3WorkspaceSelect() {
  const { user } = useAuth();
  const { account, loading } = useAccount(user?.uid);
  const packs = listAvailableContentPacks();
  const navigate = useNavigate();
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <p className="p-fig16">Loading...</p>;

  async function handleEnter(contentPackId: string) {
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-fig16 px-fig16">
      <h1 className="text-2xl font-bold">Choose your workspace</h1>
      <div className="flex flex-col gap-fig12 w-full max-w-sm">
        {packs.map((pack) => (
          <Card key={pack.content_pack_id}>
            <p className="font-semibold">{pack.display_name}</p>
            <p className="text-xs text-ink-soft mb-fig12">
              {pack.zones.length} zones · content pack: {pack.content_pack_id}
            </p>
            <Button
              disabled={!account || switchingId !== null}
              onClick={() => handleEnter(pack.content_pack_id)}
              className="w-full"
            >
              {switchingId === pack.content_pack_id ? "Switching..." : "Enter"}
            </Button>
          </Card>
        ))}
      </div>
      {error && <p className="text-accent-red text-xs max-w-sm text-center">{error}</p>}
      <p className="text-xs text-ink-soft">One engine · one content pack per site</p>
    </div>
  );
}
