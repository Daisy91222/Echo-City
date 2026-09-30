import { useNavigate } from "react-router-dom";

// REV 04（2026-09-30）：Diasy 反馈"有些界面没有办法回到主页"——除主页 S1 本身
// 和登录/注册两个入口屏幕（L1/L2，此时还没有"主页"可回）外，其余所有屏幕统一加
// 这个左上角半圆按钮，点击直接 navigate("/")。
//
// 定位用的是 fixed（不是 absolute），这样翻页/滚动时按钮始终贴在屏幕左上角，
// 不会被滚动带走。已知简化：在桌面浏览器里开着宽窗口测试时，390px 手机框是
// 居中显示、左右留白的，而 fixed 是相对浏览器窗口而不是这个框定位，所以这种情况下
// 按钮会贴在浏览器窗口最左边，而不是手机框的左边——只有在真手机上（或窗口本身
// 就接近 390px 宽）才会贴对位置。这是已知的桌面预览场景下的视觉偏差，不影响
// 真机演示效果，如果实际看着别扭再改。
export function BackToHome() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      aria-label="Back to home"
      onClick={() => navigate("/")}
      className="fixed top-fig16 left-0 z-50 -translate-x-1/2 w-12 h-12 rounded-full bg-ink-strong text-paper-base flex items-center justify-center shadow-hard border-2 border-paper-base"
    >
      <span aria-hidden className="translate-x-1/2 text-lg leading-none">⌂</span>
    </button>
  );
}
