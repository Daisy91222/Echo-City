import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerAndBootstrap } from "../../engine/identity/useAuth";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import type { PetSpecies } from "../../engine/companion/types";

// 对应 Figma L2（33:239）：注册 + 选宠物（像素宠物三选一）
const SPECIES: { id: PetSpecies; label: string; emoji: string }[] = [
  { id: "mochi", label: "Mochi", emoji: "🐹" },
  { id: "brick", label: "Brick", emoji: "🐱" },
  { id: "sprout", label: "Sprout", emoji: "🐰" },
];

export function L2Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [species, setSpecies] = useState<PetSpecies>("mochi");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      // 骨架阶段只有一个内容包，注册时直接绑定 riverside-yard 工作区，
      // L3 仍然展示"选工作区"这一步（只有一张卡），保留架构的可见落点（§1.9.2 引擎/内容包分离）
      await registerAndBootstrap(email, password, species, "riverside-yard");
      navigate("/select-workspace");
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-fig16 px-fig16">
      <h1 className="text-2xl font-bold">Create your account</h1>
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
            placeholder="Password (min 6 chars)"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div>
            <p className="text-xs text-ink-soft mb-1">Pick your companion</p>
            <div className="flex gap-fig12">
              {SPECIES.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => setSpecies(s.id)}
                  className={`flex-1 rounded-md border-2 py-fig12 flex flex-col items-center gap-1 ${
                    species === s.id
                      ? "border-accent-red bg-accent-sand"
                      : "border-paper-line bg-paper-base"
                  }`}
                >
                  <span className="text-2xl" aria-hidden>{s.emoji}</span>
                  <span className="text-xs">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-accent-red text-xs">{error}</p>}
          <Button type="submit" disabled={busy}>
            {busy ? "Creating..." : "Create account"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
