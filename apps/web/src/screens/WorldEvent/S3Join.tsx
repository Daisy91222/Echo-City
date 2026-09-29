import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../engine/identity/useAuth";
import { useAccount, useWorkspace } from "../../engine/workspace/useAccount";
import { ensureWorldEvent } from "../../engine/world-event/hpCounter";
import {
  joinWorldEvent,
  setEligibleToAttack,
} from "../../engine/world-event/participation";
import { useMyParticipation, useWorldEvent } from "../../engine/world-event/useWorldEvent";
import { listAnchors } from "../../content-loader";
import { BossHpBar } from "../../components/BossHpBar";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";

// 对应 Figma S3 · World Event — Join（29:148）：天空中的巨龙 + 加入弹窗。
// 对应报告 L-3.0 / R8：参战条件 = 地理围栏内 + 罗盘朝向巨龙——demo 阶段用一个
// "模拟定位"开关代替真实校验，见 participation.ts 顶部注释。
export function S3Join() {
  const { user } = useAuth();
  const { account } = useAccount(user?.uid);
  const { workspace } = useWorkspace(account?.current_workspace_id);
  const navigate = useNavigate();

  const [eventId, setEventId] = useState<string | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspace) return;
    let cancelled = false;
    setBootstrapError(null);
    // 阶段 5 修复：此前硬编码 "a1-solar-pole"（riverside-yard 专属锚点 id）当作
    // 巨龙停靠的地标——landmark_anchor_id 从未在任何界面被回读展示（纯存储字段，
    // 见 hpCounter.ts/S3Join.tsx 全文 grep 确认），所以这处硬编码不会让页面报错，
    // 但会让 the-room 工作区创建的世界事件里存一个不属于这个内容包的锚点 id，
    // 数据不诚实。改为取当前内容包的第一个锚点，对任何内容包都成立。
    const landmarkAnchorId = listAnchors(workspace.content_pack_id)[0]?.anchor_id ?? "unknown-anchor";
    ensureWorldEvent(workspace.content_pack_id, landmarkAnchorId)
      .then((event) => {
        if (!cancelled) {
          setEventId(event.event_id);
          setBootstrapping(false);
        }
      })
      .catch((err) => {
        // 2026-09-25 修复：之前这里没有 .catch，创建/读取事件失败时（例如规则还没
        // publish、或 PERMISSION_DENIED）会留下一个永远转不动的 "Loading world
        // event..."——看起来像"打不开"，但其实是一次静默失败的 promise，页面上
        // 什么错误都不会显示。现在把错误显示出来，方便 Diasy 直接看到真实报错文本。
        if (!cancelled) {
          setBootstrapError(err instanceof Error ? err.message : String(err));
          setBootstrapping(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [workspace]);

  const { event } = useWorldEvent(eventId ?? undefined);
  const { participation } = useMyParticipation(eventId ?? undefined, user?.uid);

  useEffect(() => {
    if (eventId && user && account) {
      joinWorldEvent(eventId, user.uid, account.activity_score);
    }
  }, [eventId, user, account]);

  useEffect(() => {
    if (event?.settled) navigate("/world-event/settlement");
  }, [event?.settled, navigate]);

  if (bootstrapError) {
    return (
      <div className="p-fig16">
        <p className="text-accent-red text-sm mb-fig12">Could not open world event:</p>
        <p className="text-xs font-mono bg-paper-raised border-2 border-ink-strong rounded-md p-fig12">
          {bootstrapError}
        </p>
      </div>
    );
  }

  if (bootstrapping || !event) {
    return <p className="p-fig16">Loading world event...</p>;
  }

  const eligible = participation?.eligible_to_attack ?? false;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-fig16 p-fig16">
      <div className="text-6xl" aria-hidden>
        🐉
      </div>
      <Card className="w-full max-w-sm text-center">
        <p className="text-sm mb-fig12">A world event has appeared over the yard.</p>
        <BossHpBar current={event.boss_hp_remaining} total={event.boss_hp_total} />

        <label className="flex items-center justify-center gap-2 mt-fig16 text-xs text-ink-soft">
          <input
            type="checkbox"
            checked={eligible}
            onChange={(e) => {
              if (eventId && user) setEligibleToAttack(eventId, user.uid, e.target.checked);
            }}
          />
          📍 Simulate: I'm in the geofence, facing the dragon
        </label>
        <p className="text-[10px] text-ink-soft mt-1">
          (demo 阶段模拟定位开关，代替真实 GPS + 罗盘校验)
        </p>

        <Button
          className="w-full mt-fig16"
          disabled={!eligible}
          onClick={() => navigate("/world-event/battle")}
        >
          {eligible ? "Enter Battle →" : "Get in range to attack"}
        </Button>
        <button
          className="text-xs text-ink-soft underline mt-fig12"
          onClick={() => navigate("/world-event/settlement")}
        >
          View standings
        </button>
      </Card>
    </div>
  );
}
