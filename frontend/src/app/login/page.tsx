"use client";
import { useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const resp = await api.post("/auth/login", { email, password });
      localStorage.setItem("access_token", resp.data.access_token);
      localStorage.setItem("refresh_token", resp.data.refresh_token);
      localStorage.setItem("user_name", resp.data.name);
      localStorage.setItem("user_role", resp.data.role);
      document.cookie = `access_token=${resp.data.access_token}; path=/; max-age=3600`;
      router.push("/dashboard");
    } catch {
      setError("Email ou senha invalidos");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-[#1E3A5F] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="bg-blue-900 p-2 rounded-lg"><Zap className="text-yellow-400" size={28} /></div>
          <div>
            <p className="font-bold text-slate-800 text-lg leading-tight">SGM Ferroviario</p>
            <p className="text-slate-500 text-sm">Gestao de Manutencao</p>
          </div>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="seu@email.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="........" />
          </div>
          {error && <p className="text-red-600 text-sm text-center">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors">
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

