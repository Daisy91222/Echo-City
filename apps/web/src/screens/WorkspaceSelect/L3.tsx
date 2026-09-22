import { useNavigate } from "react-router-dom";
import { useAuth } from "../../engine/identity/useAuth";
import { useAccount } from "../../engine/workspace/useAccount";
import { listAvailableContentPacks } from "../../content-loader";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";

// 对应 Figma L3（33:316）：选园区工作区 = 选内容包
// 页脚"一个引擎 · 每园区一个内容包"直接对应这个页面存在的产品架构理由
export function L3WorkspaceSelect() {
  const { user } = useAuth();
  const { account, loading } = useAccount(user?.uid);
  const packs = listAvailableContentPacks();
  const navigate = useNavigate();

  if (loading) return <p className="p-fig16">Loading...</p>;

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
              disabled={!account}
              onClick={() => navigate("/")}
              className="w-full"
            >
              Enter
            </Button>
          </Card>
        ))}
      </div>
      <p className="text-xs text-ink-soft">One engine · one content pack per site</p>
    </div>
  );
}
