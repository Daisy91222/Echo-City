import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { markRedeemed } from "../../engine/collection/redemption";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { BackToHome } from "../../components/BackToHome";

// 商户端核销页面。2026-09-27 与 Diasy 确认过的范围（见 journal.md/build-plan.md
// 阶段 3 行）：demo 阶段不做真实核销校验——这个页面复用同一个 App 的登录态，
// 不区分"登录的是不是真的商户"，任何登录用户输入一个兑换记录的 id（= 玩家出示的
// "二维码"文字）都能把它标记成已核销。量产阶段需要换成独立的商户后台 + 角色校验。
export function M1MerchantScan() {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "ok" | "already_redeemed" | "not_found">(
    "idle"
  );
  const navigate = useNavigate();

  async function handleSubmit() {
    if (!input.trim()) return;
    setStatus("pending");
    const result = await markRedeemed(input.trim());
    setStatus(result);
  }

  return (
    <div className="min-h-screen flex flex-col gap-fig16 p-fig16 items-center justify-center text-center">
      <BackToHome />
      <h1 className="text-xl font-bold">Merchant check-in</h1>
      <p className="text-xs text-ink-soft max-w-xs">
        Type the code the customer showed you, then confirm.
      </p>
      <Card className="w-full max-w-xs">
        <input
          className="w-full border-2 border-ink-strong rounded-md p-fig12 font-mono text-sm"
          placeholder="Redemption code"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </Card>
      <Button onClick={handleSubmit} disabled={status === "pending"}>
        Confirm redemption
      </Button>

      {status === "ok" && <p className="text-sm text-zone-eco">✓ Redeemed just now.</p>}
      {status === "already_redeemed" && (
        <p className="text-sm text-accent-red">This code was already redeemed.</p>
      )}
      {status === "not_found" && <p className="text-sm text-accent-red">No matching code found.</p>}

      <Button variant="secondary" onClick={() => navigate("/")}>
        ← Back to home
      </Button>
    </div>
  );
}
