import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signIn } from "../../engine/identity/useAuth";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";

// 对应 Figma L1（33:186）：纯几何英雄块 + 登录表单
export function L1Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-fig16 px-fig16">
      <div className="w-20 h-20 bg-accent-orange rounded-full shadow-hard" aria-hidden />
      <h1 className="text-2xl font-bold">EchoCity</h1>
      <Card className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-fig12">
          <input
            className="border-2 border-ink-strong rounded-md px-fig12 py-2 bg-paper-base"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="border-2 border-ink-strong rounded-md px-fig12 py-2 bg-paper-base"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-accent-red text-xs">{error}</p>}
          <Button type="submit" disabled={busy}>
            {busy ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </Card>
      <p className="text-sm text-ink-soft">
        New here? <Link className="underline" to="/register">Create an account</Link>
      </p>
    </div>
  );
}
