import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./engine/identity/useAuth";
import { L1Login } from "./screens/Login/L1";
import { L2Register } from "./screens/Register/L2";
import { L3WorkspaceSelect } from "./screens/WorkspaceSelect/L3";
import { S1Home } from "./screens/Home/S1";
import { A1AnchorScan } from "./screens/AnchorScan/A1";
import { A2AnchorDetail } from "./screens/AnchorDetail/A2";
import { S3Join } from "./screens/WorldEvent/S3Join";
import { S2Battle } from "./screens/WorldEvent/S2Battle";
import { S5Settlement } from "./screens/WorldEvent/S5Settlement";
import { C1Collection } from "./screens/Collection/C1";
import { C2Redemption } from "./screens/Redemption/C2";
import { M1MerchantScan } from "./screens/MerchantScan/M1";
import { S4Companion } from "./screens/Companion/S4";
import { D1Focus } from "./screens/Focus/D1";
import { O1OpsBackend } from "./screens/Ops/O1";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="p-fig16">Loading...</p>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// 路由结构直接对应 §4 Figma 画面清单 ★ 第 1–3 条：
// 登录 → 选工作区 → 主界面 → 锚点扫描 → 锚点详情
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<L1Login />} />
      <Route path="/register" element={<L2Register />} />
      <Route
        path="/select-workspace"
        element={
          <RequireAuth>
            <L3WorkspaceSelect />
          </RequireAuth>
        }
      />
      <Route
        path="/"
        element={
          <RequireAuth>
            <S1Home />
          </RequireAuth>
        }
      />
      <Route
        path="/anchor/:anchorId/scan"
        element={
          <RequireAuth>
            <A1AnchorScan />
          </RequireAuth>
        }
      />
      <Route
        path="/anchor/:anchorId/detail"
        element={
          <RequireAuth>
            <A2AnchorDetail />
          </RequireAuth>
        }
      />
      <Route
        path="/world-event/join"
        element={
          <RequireAuth>
            <S3Join />
          </RequireAuth>
        }
      />
      <Route
        path="/world-event/battle"
        element={
          <RequireAuth>
            <S2Battle />
          </RequireAuth>
        }
      />
      <Route
        path="/world-event/settlement"
        element={
          <RequireAuth>
            <S5Settlement />
          </RequireAuth>
        }
      />
      <Route
        path="/collection"
        element={
          <RequireAuth>
            <C1Collection />
          </RequireAuth>
        }
      />
      <Route
        path="/redeem"
        element={
          <RequireAuth>
            <C2Redemption />
          </RequireAuth>
        }
      />
      {/* 商户端核销页面——2026-09-27 与 Diasy 确认：demo 阶段不做真实核销校验，
          复用同一个 App 的登录态，不单独做商户账号体系，见 M1.tsx 顶部注释 */}
      <Route
        path="/merchant-scan"
        element={
          <RequireAuth>
            <M1MerchantScan />
          </RequireAuth>
        }
      />
      {/* 阶段 4（陪伴细化）：Companion 面板（投喂/自动喂食器/出走找回）+ 桌面专注番茄钟 */}
      <Route
        path="/companion"
        element={
          <RequireAuth>
            <S4Companion />
          </RequireAuth>
        }
      />
      <Route
        path="/focus"
        element={
          <RequireAuth>
            <D1Focus />
          </RequireAuth>
        }
      />
      {/* 阶段 5：运营后台草图（build-plan §3 阶段 5 行）。落地 §3.10 角色权限矩阵——
          见 O1.tsx 顶部注释，权限完全由当前登录账号的 Firebase staff_roles 记录决定，
          这个路由本身对任何登录用户都开放，真正的读写结果才体现权限差异。 */}
      <Route
        path="/ops"
        element={
          <RequireAuth>
            <O1OpsBackend />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
