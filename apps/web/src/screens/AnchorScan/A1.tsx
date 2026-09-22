import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/Button";
import { LiveBar } from "../../components/LiveBar";

// 对应 Figma A1（41:322）：取景器 + 扫描框 + 底部 Live Bar Nav。
// 骨架阶段没有真实摄像头识别，用一个"模拟扫描"按钮直接跳详情页，
// 保留页面结构和交互节点，识别逻辑本身不是 W2 骨架的验收范围。
export function A1AnchorScan() {
  const { anchorId } = useParams<{ anchorId: string }>();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 bg-ink-strong flex items-center justify-center">
        <div className="w-64 h-64 border-4 border-dashed border-paper-base rounded-lg flex items-center justify-center">
          <p className="text-paper-base text-sm text-center px-fig16">
            Point your camera at the marker
            <br />
            (骨架阶段：模拟扫描)
          </p>
        </div>
      </div>
      <div className="p-fig16 flex flex-col gap-fig12 bg-paper-base">
        <Button onClick={() => navigate(`/anchor/${anchorId}/detail`)}>
          Simulate scan →
        </Button>
      </div>
      <LiveBar onClick={() => navigate("/")}>
        <span className="text-sm">← Back to map</span>
        <span />
      </LiveBar>
    </div>
  );
}
