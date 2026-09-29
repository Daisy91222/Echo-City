import { useState } from "react";
import { useAuth } from "../../engine/identity/useAuth";
import { useAccount, useWorkspace } from "../../engine/workspace/useAccount";
import {
  useCurrencyChannels,
  saveCurrencyChannel,
  savePointsDailyCap,
} from "../../engine/ops/currencyConfig";
import { useLiveMerchants, saveMerchant } from "../../engine/ops/merchantAdmin";
import { listMerchants } from "../../content-loader";
import type { CurrencyChannelConfig } from "../../engine/ops/types";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";

// 阶段 5 新增：运营后台草图（build-plan §3 阶段 5 行）。落地 §3.10 角色权限矩阵——
// 不是做两套独立登录的后台系统，而是用当前登录账号真实去读/写两个此前从未被
// 任何界面碰过的 Firebase 节点：currency_channel_config（§3.10：平台维护团队
// 读写，运营专员只读）与 merchants（§3.10：运营专员读写）。这两条规则从阶段 0
// 建库起就已经写进 database.rules.json，运营后台是第一次真正验证它们成立。
//
// staff_roles/{uid} 对所有客户端零读写权限（database.rules.json 明确如此），
// 这个页面没有"以谁的身份查看"的切换开关——那样的开关只是摆设，真正的权限判断
// 完全在 Firebase 服务端按当前登录账号的 staff_roles 记录决定。要让下面两个面板
// 表现出预期的"平台维护团队能改 Credits 上限、运营专员改不了"效果，Diasy 需要
// 先去 Firebase 控制台的 Realtime Database 数据面板（不是 Rules 面板）手动写入：
//   staff_roles/{某测试账号 uid} = "platform_maintainer"
// （可选）另一个测试账号写成 "operations_specialist"，用来对比测试两种结果。
// 没有 staff_roles 记录的普通玩家账号打开这个页面，两个面板都会显示 Firebase
// 的真实 PERMISSION_DENIED 报错（因为 currency_channel_config 的读权限本身
// 也只对这两个角色开放）——这也是如实的权限行为，不是页面出错。
export function O1OpsBackend() {
  const { user } = useAuth();
  const { account } = useAccount(user?.uid);
  const { workspace } = useWorkspace(account?.current_workspace_id);

  return (
    <div className="min-h-screen flex flex-col gap-fig16 p-fig16 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">Ops Backend (staff only)</h1>
      <p className="text-xs text-ink-soft">
        §1.9.1 三方分工的字段级验证：下面两块分别对应"平台维护团队"和"运营专员"
        能写的东西，权限完全由你当前登录账号在 Firebase <code>staff_roles</code>{" "}
        节点里的记录决定（客户端读不到这个节点本身，只能通过实际的读写结果反推）。
      </p>

      <CurrencyPanel workspaceId={workspace?.workspace_id} />
      <MerchantPanel contentPackId={workspace?.content_pack_id} />
    </div>
  );
}

const SUGGESTED_CHANNELS: Omit<CurrencyChannelConfig, "cap_value">[] = [
  { channel_id: "activity_daily_cap", currency: "credits", cap_type: "fixed_threshold", active: true },
  { channel_id: "collection_milestone", currency: "credits", cap_type: "fixed_threshold", active: true },
  { channel_id: "merchant_cashback", currency: "credits", cap_type: "fixed_threshold", active: true },
  { channel_id: "world_event_pool", currency: "credits", cap_type: "fixed_pool_total", active: true },
];

function CurrencyPanel({ workspaceId }: { workspaceId: string | undefined }) {
  const { channels, loading, readError } = useCurrencyChannels();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [writeResult, setWriteResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [capDraft, setCapDraft] = useState("");
  const [capResult, setCapResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSave(base: Omit<CurrencyChannelConfig, "cap_value">) {
    const raw = draft[base.channel_id];
    const capValue = Number(raw);
    if (!raw || Number.isNaN(capValue)) return;
    try {
      await saveCurrencyChannel({ ...base, cap_value: capValue });
      setWriteResult({ ok: true, text: `✓ Saved ${base.channel_id} = ${capValue}` });
    } catch (err) {
      setWriteResult({
        ok: false,
        text: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function handleSaveCap() {
    if (!workspaceId) return;
    const capValue = Number(capDraft);
    if (!capDraft || Number.isNaN(capValue)) return;
    try {
      await savePointsDailyCap(workspaceId, capValue);
      setCapResult({ ok: true, text: `✓ Saved points_daily_cap = ${capValue}` });
    } catch (err) {
      setCapResult({ ok: false, text: err instanceof Error ? err.message : String(err) });
    }
  }

  return (
    <Card>
      <p className="font-semibold mb-1">Platform Maintainer — Currency channel caps</p>
      <p className="text-[11px] text-ink-soft mb-fig12">
        currency_channel_config（§3.5/§3.10）：只有平台维护团队能写。
      </p>

      {readError && (
        <p className="text-xs font-mono bg-paper-base border-2 border-accent-red rounded-md p-fig12 mb-fig12">
          Read denied: {readError}
        </p>
      )}
      {!readError && loading && <p className="text-xs text-ink-soft">Loading...</p>}

      {!readError && (
        <div className="flex flex-col gap-fig12">
          {SUGGESTED_CHANNELS.map((base) => {
            const existing = channels[base.channel_id];
            return (
              <div key={base.channel_id} className="flex items-center gap-2">
                <span className="text-xs flex-1">
                  {base.channel_id}
                  {existing && (
                    <span className="text-ink-soft"> (current: {existing.cap_value})</span>
                  )}
                </span>
                <input
                  className="border-2 border-ink-strong rounded-md px-2 py-1 w-20 text-xs bg-paper-base"
                  placeholder="cap"
                  value={draft[base.channel_id] ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [base.channel_id]: e.target.value }))
                  }
                />
                <Button
                  variant="secondary"
                  className="!h-8 !px-3 text-[11px]"
                  onClick={() => handleSave(base)}
                >
                  Save
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {writeResult && (
        <p
          className={`text-xs mt-fig12 font-mono border-2 rounded-md p-fig12 ${
            writeResult.ok
              ? "border-zone-eco text-zone-eco"
              : "border-accent-red text-accent-red"
          }`}
        >
          {writeResult.text}
        </p>
      )}

      <div className="mt-fig16 pt-fig12 border-t-2 border-paper-line">
        <p className="text-xs mb-1">
          Current workspace <code>points_daily_cap</code> ({workspaceId ?? "no workspace"})
        </p>
        <div className="flex items-center gap-2">
          <input
            className="border-2 border-ink-strong rounded-md px-2 py-1 w-20 text-xs bg-paper-base"
            placeholder="cap"
            value={capDraft}
            onChange={(e) => setCapDraft(e.target.value)}
          />
          <Button
            variant="secondary"
            className="!h-8 !px-3 text-[11px]"
            disabled={!workspaceId}
            onClick={handleSaveCap}
          >
            Save
          </Button>
        </div>
        {capResult && (
          <p
            className={`text-xs mt-2 font-mono ${
              capResult.ok ? "text-zone-eco" : "text-accent-red"
            }`}
          >
            {capResult.text}
          </p>
        )}
      </div>
    </Card>
  );
}

function MerchantPanel({ contentPackId }: { contentPackId: string | undefined }) {
  const { merchants, loading, readError } = useLiveMerchants();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSeedFromContentPack() {
    if (!contentPackId) return;
    try {
      for (const m of listMerchants(contentPackId)) {
        await saveMerchant(m);
      }
      setResult({ ok: true, text: "✓ Seeded live merchants/ node from content pack" });
    } catch (err) {
      setResult({ ok: false, text: err instanceof Error ? err.message : String(err) });
    }
  }

  async function handleSave(merchantId: string) {
    const existing = merchants[merchantId];
    if (!existing) return;
    const raw = draft[merchantId];
    const value = Number(raw);
    if (!raw || Number.isNaN(value)) return;
    try {
      await saveMerchant({
        ...existing,
        discount_config: { ...existing.discount_config, value },
      });
      setResult({ ok: true, text: `✓ Saved ${merchantId} discount value = ${value}` });
    } catch (err) {
      setResult({ ok: false, text: err instanceof Error ? err.message : String(err) });
    }
  }

  return (
    <Card>
      <p className="font-semibold mb-1">Operations Specialist — Merchant discounts</p>
      <p className="text-[11px] text-ink-soft mb-fig12">
        merchants（§3.8/§3.10）：运营专员能写，平台维护团队反而不在这条规则的写权限里——
        这是同一份权限矩阵反过来的一半，和上面的 Currency 面板凑成完整对比。
        注意：App 其余部分（Redemption/C2）读的是内容包静态 JSON，不读这里的
        Firebase 实时节点，所以这里的写入不会让 C2 页面立刻变化，这个面板只
        用来验证权限本身，不是要把兑换页也接进来（超出阶段 5 范围，如实说明）。
      </p>

      {readError && (
        <p className="text-xs font-mono bg-paper-base border-2 border-accent-red rounded-md p-fig12 mb-fig12">
          Read denied: {readError}
        </p>
      )}
      {!readError && loading && <p className="text-xs text-ink-soft">Loading...</p>}

      {!readError && Object.keys(merchants).length === 0 && (
        <Button
          variant="secondary"
          className="!h-8 !px-3 text-[11px] mb-fig12"
          disabled={!contentPackId}
          onClick={handleSeedFromContentPack}
        >
          Seed live merchants/ from current content pack
        </Button>
      )}

      {!readError && (
        <div className="flex flex-col gap-fig12">
          {Object.values(merchants).map((m) => (
            <div key={m.merchant_id} className="flex items-center gap-2">
              <span className="text-xs flex-1">
                {m.display_name} ({m.discount_config.type}: {m.discount_config.value})
              </span>
              <input
                className="border-2 border-ink-strong rounded-md px-2 py-1 w-16 text-xs bg-paper-base"
                placeholder="value"
                value={draft[m.merchant_id] ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, [m.merchant_id]: e.target.value }))}
              />
              <Button
                variant="secondary"
                className="!h-8 !px-3 text-[11px]"
                onClick={() => handleSave(m.merchant_id)}
              >
                Save
              </Button>
            </div>
          ))}
        </div>
      )}

      {result && (
        <p
          className={`text-xs mt-fig12 font-mono border-2 rounded-md p-fig12 ${
            result.ok ? "border-zone-eco text-zone-eco" : "border-accent-red text-accent-red"
          }`}
        >
          {result.text}
        </p>
      )}
    </Card>
  );
}
