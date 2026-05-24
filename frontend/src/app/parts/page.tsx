"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import { Plus, Search, RefreshCw, X, Package } from "lucide-react";
import clsx from "clsx";
const emptyForm = { code: "", name: "", description: "", unit: "un", quantity_stock: 0, quantity_minimum: 0, unit_cost: "", supplier: "" };
export default function PartsPage() {
  const [parts, setParts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<any>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const load = () => { setLoading(true); api.get("/parts/", { params: { limit: 100 } }).then((r) => setParts(r.data)).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);
  const filtered = parts.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase()));
  const handleSubmit = async () => {
    if (!form.code || !form.name) { setError("Preencha Codigo e Nome"); return; }
    setSaving(true); setError("");
    try {
      const payload: any = { ...form };
      if (!payload.description) delete payload.description;
      if (!payload.unit_cost) delete payload.unit_cost;
      if (!payload.supplier) delete payload.supplier;
      payload.quantity_stock = parseFloat(payload.quantity_stock) || 0;
      payload.quantity_minimum = parseFloat(payload.quantity_minimum) || 0;
      if (payload.unit_cost) payload.unit_cost = parseFloat(payload.unit_cost);
      await api.post("/parts/", payload);
      setShowModal(false); setForm({ ...emptyForm }); load();
    } catch (e: any) { setError(e?.response?.data?.detail || "Erro ao criar peca"); } finally { setSaving(false); }
  };
  const handleDelete = async (id: string) => {
    if (!confirm("Desativar esta peca?")) return;
    try { await api.delete("/parts/" + id); load(); } catch { alert("Erro ao excluir peca"); }
  };
  const inp = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const lbl = "block text-sm font-medium text-slate-700 mb-1";
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="text-2xl font-bold text-slate-800">Pecas e Materiais</h1><p className="text-slate-500 text-sm">{parts.length} registros</p></div>
          <button onClick={() => { setForm({ ...emptyForm }); setError(""); setShowModal(true); }} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"><Plus size={16} /> Nova Peca</button>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 flex gap-3">
          <div className="relative flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none" placeholder="Buscar por nome ou codigo..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <button onClick={load} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50"><RefreshCw size={15} className="text-slate-500" /></button>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Codigo</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Nome</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Unidade</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Estoque</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Minimo</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Custo Unit.</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Fornecedor</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Carregando...</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400"><div className="flex flex-col items-center gap-2"><Package size={32} className="text-slate-300" /><span>Nenhuma peca cadastrada</span></div></td></tr>
              : filtered.map(p => (
                <tr key={p.id} className={clsx("hover:bg-slate-50", p.quantity_stock <= p.quantity_minimum && p.quantity_minimum > 0 && "bg-red-50")}>
                  <td className="px-4 py-3 font-mono font-semibold text-blue-700">{p.code}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                  <td className="px-4 py-3 text-slate-500">{p.unit}</td>
                  <td className="px-4 py-3"><span className={clsx("font-semibold", p.quantity_stock <= p.quantity_minimum && p.quantity_minimum > 0 ? "text-red-600" : "text-slate-800")}>{p.quantity_stock}</span></td>
                  <td className="px-4 py-3 text-slate-500">{p.quantity_minimum}</td>
                  <td className="px-4 py-3 text-slate-500">{p.unit_cost ? "R$ " + p.unit_cost.toFixed(2) : "-"}</td>
                  <td className="px-4 py-3 text-slate-500">{p.supplier || "-"}</td>
                  <td className="px-4 py-3"><button onClick={() => handleDelete(p.id)} className="text-red-500 hover:underline text-xs">Desativar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {showModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-800">Nova Peca</h2>
                <button onClick={() => setShowModal(false)}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={lbl}>Codigo *</label><input className={inp} value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="Ex: FLT-001" /></div>
                  <div><label className={lbl}>Unidade</label><select className={inp} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}><option value="un">un</option><option value="kg">kg</option><option value="l">l</option><option value="m">m</option><option value="cx">cx</option><option value="par">par</option></select></div>
                </div>
                <div><label className={lbl}>Nome *</label><input className={inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Filtro de oleo" /></div>
                <div><label className={lbl}>Descricao</label><textarea className={inp} rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Descricao opcional" /></div>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className={lbl}>Estoque</label><input className={inp} type="number" value={form.quantity_stock} onChange={e => setForm({ ...form, quantity_stock: e.target.value })} /></div>
                  <div><label className={lbl}>Minimo</label><input className={inp} type="number" value={form.quantity_minimum} onChange={e => setForm({ ...form, quantity_minimum: e.target.value })} /></div>
                  <div><label className={lbl}>Custo Unit.</label><input className={inp} type="number" step="0.01" value={form.unit_cost} onChange={e => setForm({ ...form, unit_cost: e.target.value })} /></div>
                </div>
                <div><label className={lbl}>Fornecedor</label><input className={inp} value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} placeholder="Nome do fornecedor" /></div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
              </div>
              <div className="flex justify-end gap-3 p-6 border-t border-slate-100">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50">{saving ? "Salvando..." : "Criar Peca"}</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
