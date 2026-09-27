import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../engine/identity/useAuth";
import { useAccount, useWorkspace } from "../../engine/workspace/useAccount";
import { listMerchants } from "../../content-loader";
import { createRedemption } from "../../engine/collection/redemption";
import type { RedemptionRecord } from "../../engine/collection/types";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { StatChip } from "../../components/StatChip";

// 对应 Figma C2（兑换页）：商户列表 + Credits 花费 → 出示二维码 → 商户端扫码核销。
// "二维码"在 demo 里就是 redemption_id 本身的文字展示（见 redemption.ts 顶部注释
// 对这处简化的完整说明），核销页面见 MerchantScan/M1.tsx。
export function C2Redemption() {
  const { user } = useAuth();
  const { account } = useAccount(user?.uid);
  const { workspace } = useWorkspace(account?.current_workspace_id);
  const navigate = useNavigate();
  const [activeRecord, setActiveRecord] = useState<RedemptionRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!workspace) {
    return <p className="p-fig16">Loading...</p>;
  }

  const merchants = listMerchants(workspace.content_pack_id);

  async function handleRedeem(merchantId: string, creditsCost: number) {
    setError(null);
    setPending(true);
    const record = await createRedemption(workspace!.workspace_id, merchantId, creditsCost);
    setPending(false);
    if (!record) {
      setError("Not enough Credits for this discount.");
      return;
    }
    setActiveRecord(record);
  }

  if (activeRecord) {
    return (
      <div className="min-h-screen flex flex-col gap-fig16 p-fig16 items-center justify-center text-center">
        <p className="text-sm text-ink-soft">Show this code to the merchant</p>
        <Card className="w-full max-w-xs">
          <div className="text-4xl mb-fig12" aria-hidden>
            ▦
          </div>
          <p className="font-mono text-sm break-all">{activeRecord.qr_token}</p>
        </Card>
        <p className="text-xs text-ink-soft">
          {activeRecord.credits_spent} Credits spent · not yet redeemed
        </p>
        <Button variant="secondary" onClick={() => setActiveRecord(null)}>
          ← Back to merchants
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col gap-fig16 p-fig16">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Redeem</h1>
        <StatChip icon="◇" value={workspace.credits_balance} label="Credits" />
      </div>

      {error && <p className="text-xs text-accent-red">{error}</p>}

      <div className="flex flex-col gap-fig12">
        {merchants.map((merchant) => (
          <Card key={merchant.merchant_id}>
            <p className="text-sm font-semibold">{merchant.display_name}</p>
            <p className="text-xs text-ink-soft mt-1">{merchant.discount_config.description}</p>
            <div className="mt-fig12">
              <Button
                variant="secondary"
                disabled={pending || workspace.credits_balance < merchant.discount_config.credits_cost}
                onClick={() => handleRedeem(merchant.merchant_id, merchant.discount_config.credits_cost)}
              >
                Redeem for {merchant.discount_config.credits_cost} ◇
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Button variant="secondary" onClick={() => navigate("/collection")}>
        ← Back to collection
      </Button>
    </div>
  );
}
