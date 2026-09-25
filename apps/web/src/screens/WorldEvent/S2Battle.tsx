import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../engine/identity/useAuth";
import { useAccount } from "../../engine/workspace/useAccount";
import {
  ACTIVITY_SETTLEMENT_INTERVAL_MS,
  settleOwnActivityDamage,
  submitMinigameDamage,
} from "../../engine/world-event/participation";
import { useMyParticipation, useWorldEvent } from "../../engine/world-event/useWorldEvent";
import { activeEventId } from "../../engine/world-event/hpCounter";
import { useWorkspace } from "../../engine/workspace/useAccount";
import { BossHpBar } from "../../components/BossHpBar";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";

const ROUND_MS = 20_000;
const SPAWN_INTERVAL_MS = 1_100;

interface Bubble {
  id: number;
  x: number; // 0-100 (%)
  bornAt: number;
}

// 2026-09-25 调慢（Diasy 反馈点不到）：泡泡下落耗时从 2400ms 拉长到 5200ms，
// 生成间隔（上面 SPAWN_INTERVAL_MS）也从 700ms 拉长到 1100ms，两者一起让屏幕上
// 同时存在的泡泡更少、每个泡泡停留时间更长，点击窗口变宽。
const BUBBLE_FALL_MS = 5_200;

// 对应 Figma S2 · World Event — Battle（21:127）：巨龙 + 掉落泡泡 + TAP。
// 阶段 2 第一版：只做"战斗期打怪掉落道具、边打边拾取"的核心手感（点泡泡=造成伤害），
// 报告 R8 里"准备期用步行积累的资源购买技能"这个技能槽/肉鸽养成部分还没做，
// 留作后续迭代——这和阶段 1 把 Cloud Functions cron 简化成手动脚本是同一类"先跑通
// 最薄一层，逐步加厚"的做法，已记入 build-plan.md。
export function S2Battle() {
  const { user } = useAuth();
  const { account } = useAccount(user?.uid);
  const { workspace } = useWorkspace(account?.current_workspace_id);
  const eventId = workspace ? activeEventId(workspace.content_pack_id) : undefined;
  const { event } = useWorldEvent(eventId);
  const { participation } = useMyParticipation(eventId, user?.uid);
  const navigate = useNavigate();

  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [roundActive, setRoundActive] = useState(false);
  const [roundDamage, setRoundDamage] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [activityMsg, setActivityMsg] = useState<string | null>(null);
  const nextId = useRef(0);
  // 2026-09-25 修复（Diasy 反馈“点了但血条没减少”）：stopRound 是靠 useCallback
  // 记忆化的，闭包里的 roundDamage 是“创建这个 stopRound 实例时”那一刻的值；而
  // startRound 里的 window.setTimeout(() => stopRound(), ROUND_MS) 在回合开始那一刻
  // 就把当时（roundDamage === 0）的 stopRound 实例锁死了，之后每次点泡泡触发的
  // re-render 都会生成新的 stopRound 实例，但 setTimeout 里存的还是最早那个旧实例——
  // 15/20 秒后真正执行的 stopRound 用的还是 roundDamage === 0，导致
  // “if (roundDamage > 0) 才提交伤害”这一步恒不成立，伤害从未真正提交给共享血条。
  // 用 ref 记录本回合累计伤害，popBubble 和 stopRound 都读写这个 ref 而不是那份
  // state 闭包，ref 是同一个可变对象，不会有“哪个渲染时刻的旧值”这个问题。
  const roundDamageRef = useRef(0);
  const spawnTimer = useRef<number | null>(null);
  const endTimer = useRef<number | null>(null);
  const cleanupTimer = useRef<number | null>(null);

  useEffect(() => {
    if (event?.settled) navigate("/world-event/settlement");
  }, [event?.settled, navigate]);

  const stopRound = useCallback(async () => {
    setRoundActive(false);
    if (spawnTimer.current) window.clearInterval(spawnTimer.current);
    if (cleanupTimer.current) window.clearInterval(cleanupTimer.current);
    setBubbles([]);

    const finalDamage = roundDamageRef.current;
    if (finalDamage > 0 && eventId) {
      setSubmitting(true);
      await submitMinigameDamage(eventId, user!.uid, finalDamage);
      setSubmitting(false);
    }
    roundDamageRef.current = 0;
    setRoundDamage(0);
  }, [eventId, user]);

  const startRound = () => {
    roundDamageRef.current = 0;
    setRoundDamage(0);
    setRoundActive(true);
    spawnTimer.current = window.setInterval(() => {
      setBubbles((prev) => [
        ...prev,
        { id: nextId.current++, x: 10 + Math.random() * 80, bornAt: Date.now() },
      ]);
    }, SPAWN_INTERVAL_MS);
    cleanupTimer.current = window.setInterval(() => {
      const now = Date.now();
      setBubbles((prev) => prev.filter((b) => now - b.bornAt < BUBBLE_FALL_MS));
    }, 200);
    endTimer.current = window.setTimeout(() => {
      stopRound();
    }, ROUND_MS);
  };

  useEffect(() => {
    return () => {
      if (spawnTimer.current) window.clearInterval(spawnTimer.current);
      if (cleanupTimer.current) window.clearInterval(cleanupTimer.current);
      if (endTimer.current) window.clearTimeout(endTimer.current);
    };
  }, []);

  const popBubble = (id: number) => {
    setBubbles((prev) => prev.filter((b) => b.id !== id));
    roundDamageRef.current += 1;
    setRoundDamage((d) => d + 1);
  };

  const handleActivitySettlement = async () => {
    if (!eventId || !user || !account || !participation) return;
    const result = await settleOwnActivityDamage(eventId, user.uid, account.activity_score);
    if (result.settled) {
      setActivityMsg(`+${result.damageDealt} damage from your activity`);
    } else if (result.reason === "not_due_yet") {
      const remainingMs =
        (participation.last_activity_settlement_at + ACTIVITY_SETTLEMENT_INTERVAL_MS) -
        Date.now();
      const hours = Math.max(0, Math.ceil(remainingMs / 3_600_000));
      setActivityMsg(`Next activity settlement in ~${hours}h`);
    } else {
      setActivityMsg("No new activity to convert yet");
    }
  };

  if (!event || !participation) return <p className="p-fig16">Loading...</p>;

  if (!participation.eligible_to_attack) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-fig16 gap-fig12">
        <p className="text-sm text-ink-soft">You're not in range to attack.</p>
        <Button onClick={() => navigate("/world-event/join")}>Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-fig16 gap-fig16">
      <BossHpBar current={event.boss_hp_remaining} total={event.boss_hp_total} />

      <div
        className="relative flex-1 bg-paper-raised border-2 border-ink-strong rounded-lg overflow-hidden"
        style={{ minHeight: 320 }}
      >
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-4xl" aria-hidden>
          🐉
        </div>
        {bubbles.map((b) => (
          <button
            key={b.id}
            onClick={() => popBubble(b.id)}
            className="absolute text-2xl"
            style={{
              left: `${b.x}%`,
              top: `${Math.min(90, ((Date.now() - b.bornAt) / BUBBLE_FALL_MS) * 90)}%`,
            }}
            aria-label="pop bubble"
          >
            🫧
          </button>
        ))}
        {!roundActive && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Button onClick={startRound} disabled={submitting}>
              {submitting ? "Submitting damage..." : "⚔️ Attack (15s round)"}
            </Button>
          </div>
        )}
      </div>

      <Card className="text-center">
        <p className="text-sm">
          This round: <strong>{roundDamage}</strong> damage
        </p>
        <p className="text-xs text-ink-soft mt-1">
          My total: {participation.damage_from_minigame + participation.damage_from_activity}
        </p>
      </Card>

      <Card className="text-center">
        <p className="text-xs text-ink-soft mb-fig12">
          Activity → damage conversion (every 6h)
        </p>
        <Button variant="secondary" className="w-full" onClick={handleActivitySettlement}>
          Convert my activity
        </Button>
        {activityMsg && <p className="text-xs mt-fig12">{activityMsg}</p>}
      </Card>

      <button className="text-xs text-ink-soft underline" onClick={() => navigate("/world-event/join")}>
        Back
      </button>
    </div>
  );
}
