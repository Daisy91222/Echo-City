import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./engine/identity/useAuth";
import { L1Login } from "./screens/Login/L1";
import { L2Register } from "./screens/Register/L2";
import { L3WorkspaceSelect } from "./screens/WorkspaceSelect/L3";
import { S1Home } from "./screens/Home/S1";
import { A1AnchorScan } from "./screens/AnchorScan/A1";
import { A2AnchorDetail } from "./screens/AnchorDetail/A2";

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
    </Routes>
  );
}
