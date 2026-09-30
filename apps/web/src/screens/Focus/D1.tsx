import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../engine/identity/useAuth";
import { useAccount } from "../../engine/workspace/useAccount";
import {
  ACTIVITY_PER_FOCUS_SESSION,
  FOCUS_SESSION_SECONDS,
  completeFocusSession,
} from "../../engine/companion/focus";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { BackToHome } from "../../components/BackToHome";

// 对应 Figma D1（43:368）："从窗框看出去的小地图番茄钟"。骨架版先不画窗框
// 小地图本身（美术资源待 Diasy 提供），用一个纯数字倒计时 + 窗框色块占位，
// 保留"倒计时走完才加活跃度"这条机制——这是这个屏幕在产品里真正要验证的部分，
// 视觉细化可以在美术资源到位后单独替换，不影响下面的计时/上报逻辑。
export function D1Focus() {
  const { user } = useAuth();
  const { account } = useAccount(user?.uid);
  const navigate = useNavigate();
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_SESSION_SECONDS);
  const [running, setRunning] = useState(true);
  const [done, setDone] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!running || done) return;
    const interval = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [running, done]);

  useEffect(() => {
    if (secondsLeft > 0 || done || !account || completedRef.current) return;
    // completedRef 防止 effect 因为其余依赖变化重复触发时把活跃度多加一次——
    // 一次专注会话只应该记一次，不靠 completeFocusSession 内部去重（它本身
    // 只是一个普通的加法事务，不是"领取一次"的守卫事务，因为专注会话本身
    // 没有一个可以拿来当幂等 key 的持久 id，靠这个 ref 在客户端做一次性保护
    // 已经足够——demo 阶段唯一会重复触发的场景是同一次会话内部的 re-render，
    // 不是跨会话重放）。
    completedRef.current = true;
    setDone(true);
    void completeFocusSession(account.account_id);
  }, [secondsLeft, done, account]);

  const minutes = Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (secondsLeft % 60).toString().padStart(2, "0");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-fig16 p-fig16">
      <BackToHome />
      <Card className="w-full max-w-sm text-center">
        {/* 窗框占位——四条粗边框模拟"从窗框看出去"，真实素材待 Diasy 提供 */}
        <div className="border-4 border-ink-strong rounded-md p-fig16 bg-paper-base">
          <p className="text-xs text-ink-soft mb-fig12">Desk focus</p>
          {done ? (
            <>
              <p className="text-4xl mb-fig12" aria-hidden>
                ✅
              </p>
              <p className="text-sm">Session complete! +{ACTIVITY_PER_FOCUS_SESSION} activity.</p>
            </>
          ) : (
            <>
              <p className="text-5xl font-bold font-pixel tabular-nums">
                {minutes}:{seconds}
              </p>
              <p className="text-xs text-ink-soft mt-fig12">
                Stay here — your companion is walking alongside you.
              </p>
            </>
          )}
        </div>
      </Card>

      <div className="flex gap-fig12">
        {!done && (
          <Button variant="secondary" onClick={() => setRunning((r) => !r)}>
            {running ? "Pause" : "Resume"}
          </Button>
        )}
        <Button variant={done ? "primary" : "secondary"} onClick={() => navigate("/companion")}>
          {done ? "Back to companion →" : "Give up"}
        </Button>
      </div>
    </div>
  );
}
