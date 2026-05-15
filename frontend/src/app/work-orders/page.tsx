"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import { Plus, Filter, Search, RefreshCw, X } from "lucide-react";
import clsx from "clsx";
const PRIORITY_BADGE: Record<string, string> = { critical: "bg-red-100 text-red-700", high: "bg-orange-100 text-orange-700", medium: "bg-amber-100 text-amber-700", low: "bg-green-100 text-green-700" };
const STATUS_BADGE: Record<string, string> = { pending: "bg-slate-100 text-slate-600", assigned: "bg-blue-100 text-blue-700", in_progress: "bg-indigo-100 text-indigo-700", paused: "bg-yellow-100 text-yellow-700", waiting_parts: "bg-orange-100 text-orange-700", waiting_approval: "bg-purple-100 text-purple-700", completed: "bg-green-100 text-green-700", cancelled: "bg-slate-100 text-slate-400" };
const STATUS_LABEL: Record<string, string> = { pending: "Pendente", assigned: "Atribuida", in_progress: "Em Execucao", paused: "Pausada", waiting_parts: "Ag. Pecas", completed: "Concluida", cancelled: "Cancelada", waiting_approval: "Ag. Aprovacao" };
const MAINTENANCE_BADGE: Record<string, string> = { preventive: "bg-blue-100 text-blue-700", corrective: "bg-red-100 text-red-700", emergency: "bg-rose-100 text-rose-800", predictive: "bg-purple-100 text-purple-700", inspection: "bg-teal-100 text-teal-700", calibration: "bg-gray-100 text-gray-700" };
const MAINTENANCE_LABEL: Record<string, string> = { preventive: "Preventiva", corrective: "Corretiva", emergency: "Emergencial", predictive: "Preditiva", inspection: "Inspecao", calibration: "Calibracao" };
const emptyForm = { title: "", description: "", asset_id: "", maintenance_type: "corrective", priority: "medium", scheduled_start: "", scheduled_end: "", estimated_duration_h: "", assigned_to_id: "", contractor_name: "", contractor_document: "", internal_hours: "", contractor_hours: "" };
export default function WorkOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<any>({...emptyForm});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const load = () => {
    setLoading(true);
    Promise.all([
      api.get("/work-orders", { params: { status: statusFilter || undefined, limit: 100 } }).then((r) => setOrders(r.data)),
      api.get("/assets", { params: { limit: 100 } }).then((r) => setAssets(r.data)),
    ]).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [statusFilter]);
  const filtered = orders.filter((o) => (!search || o.number?.toLowerCase().includes(search.toLowerCase()) || o.title?.toLowerCase().includes(search.toLowerCase())) && (!typeFilter || o.maintenance_type === typeFilter));
  const handleSubmit = async () => {
    if (!form.title || !form.asset_id || !form.maintenance_type) { setError("Preencha titulo, ativo e tipo de manutencao"); return; }
    setSaving(true); setError("");
    try {
      const payload: any = { ...form };
      if (payload.estimated_duration_h) payload.estimated_duration_h = parseFloat(payload.estimated_duration_h);
      if (payload.internal_hours) payload.internal_hours = parseFloat(payload.internal_hours);
      if (payload.contractor_hours) payload.contractor_hours = parseFloat(payload.contractor_hours);
      if (!payload.scheduled_start) delete payload.scheduled_start;
      if (!payload.scheduled_end) delete payload.scheduled_end;
      if (!payload.assigned_to_id) delete payload.assigned_to_id;
      if (!payload.contractor_name) delete payload.contractor_name;
      if (!payload.contractor_document) delete payload.contractor_document;
      if (!payload.internal_hours) delete payload.internal_hours;
      if (!payload.contractor_hours) delete payload.contractor_hours;
      await api.post("/work-orders", payload);
      setShowModal(false); setForm({...emptyForm}); load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Erro ao criar OS");
    } finally { setSaving(false); }
  };
  const inp = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const lbl = "block text-sm font-medium text-slate-700 mb-1";
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="text-2xl font-bold text-slate-800">Ordens de Servico</h1><p className="text-slate-500 text-sm">{filtered.length} registros</p></div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"><Plus size={16} /> Nova OS</button>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 min-w-48"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Buscar por numero ou titulo..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">Todos os status</option>{Object.entries(STATUS_LABEL).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}</select>
          <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}><option value="">Todos os tipos</option>{Object.entries(MAINTENANCE_LABEL).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}</select>
          <button onClick={load} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50"><RefreshCw size={15} className="text-slate-500" /></button>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200"><tr>{["Numero","Titulo","Ativo","Tipo","Equipe / Terceirizada","Horas Int.","Horas Terc.","Prioridade","Status","Prazo","Acoes"].map((h) => (<th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>))}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (<tr><td colSpan={11} className="text-center py-10 text-slate-400">Carregando...</td></tr>
              ) : filtered.length === 0 ? (<tr><td colSpan={11} className="text-center py-10 text-slate-400">Nenhuma OS encontrada</td></tr>
              ) : filtered.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-blue-700">{o.number}</td>
                  <td className="px-4 py-3 max-w-xs"><p className="truncate font-medium text-slate-800">{o.title}</p></td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{assets.find(a => a.id === o.asset_id)?.name || o.asset_id?.slice(0,8)}</td>
                  <td className="px-4 py-3"><span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", MAINTENANCE_BADGE[o.maintenance_type] || "bg-gray-100 text-gray-600")}>{MAINTENANCE_LABEL[o.maintenance_type] || o.maintenance_type}</span></td>
                  <td className="px-4 py-3 text-xs">{o.team_id ? <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">Interna</span> : null}{o.contractor_name ? <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-medium ml-1">{o.contractor_name}</span> : null}{!o.team_id && !o.contractor_name ? <span className="text-slate-400">—</span> : null}</td>
                  <td className="px-4 py-3 text-center">{o.internal_hours != null ? <span className="font-semibold text-blue-700">{o.internal_hours}h</span> : <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3 text-center">{o.contractor_hours != null ? <span className="font-semibold text-orange-600">{o.contractor_hours}h</span> : <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3"><span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", PRIORITY_BADGE[o.priority])}>{o.priority}</span></td>
                  <td className="px-4 py-3"><span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", STATUS_BADGE[o.status])}>{STATUS_LABEL[o.status] || o.status}</span></td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{o.scheduled_end ? new Date(o.scheduled_end).toLocaleDateString("pt-BR") : "—"}</td>
                  <td className="px-4 py-3"><button className="text-blue-600 hover:underline text-xs">Ver</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-800">Nova Ordem de Servico</h2>
                <button onClick={() => { setShowModal(false); setError(""); setForm({...emptyForm}); }} className="p-2 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div><label className={lbl}>Titulo *</label><input className={inp} value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Ex: Manutencao corretiva do gerador" /></div>
                <div><label className={lbl}>Descricao</label><textarea className={inp} rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Descricao detalhada..." /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={lbl}>Ativo *</label><select className={inp} value={form.asset_id} onChange={e => setForm({...form, asset_id: e.target.value})}><option value="">Selecione um ativo</option>{assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.tag})</option>)}</select></div>
                  <div><label className={lbl}>Tipo de Manutencao *</label><select className={inp} value={form.maintenance_type} onChange={e => setForm({...form, maintenance_type: e.target.value})}>{Object.entries(MAINTENANCE_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={lbl}>Prioridade</label><select className={inp} value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}><option value="low">Baixa</option><option value="medium">Media</option><option value="high">Alta</option><option value="critical">Critica</option></select></div>
                  <div><label className={lbl}>Duracao Estimada (horas)</label><input type="number" className={inp} value={form.estimated_duration_h} onChange={e => setForm({...form, estimated_duration_h: e.target.value})} placeholder="Ex: 4" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={lbl}>Inicio Previsto</label><input type="datetime-local" className={inp} value={form.scheduled_start} onChange={e => setForm({...form, scheduled_start: e.target.value})} /></div>
                  <div><label className={lbl}>Fim Previsto</label><input type="datetime-local" className={inp} value={form.scheduled_end} onChange={e => setForm({...form, scheduled_end: e.target.value})} /></div>
                </div>
                <div className="border-t border-slate-100 pt-4"><p className="text-sm font-semibold text-slate-700 mb-3">Execucao</p>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={lbl}>Empresa Terceirizada</label><input className={inp} value={form.contractor_name} onChange={e => setForm({...form, contractor_name: e.target.value})} placeholder="Nome da empresa" /></div>
                  <div><label className={lbl}>CNPJ da Terceirizada</label><input className={inp} value={form.contractor_document} onChange={e => setForm({...form, contractor_document: e.target.value})} placeholder="00.000.000/0000-00" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div><label className={lbl}>Horas Internas</label><input type="number" step="0.5" className={inp} value={form.internal_hours} onChange={e => setForm({...form, internal_hours: e.target.value})} placeholder="Ex: 8" /></div>
                  <div><label className={lbl}>Horas Terceirizadas</label><input type="number" step="0.5" className={inp} value={form.contractor_hours} onChange={e => setForm({...form, contractor_hours: e.target.value})} placeholder="Ex: 4" /></div>
                </div></div>
                {error && <p className="text-red-600 text-sm">{error}</p>}
              </div>
              <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
                <button onClick={() => { setShowModal(false); setError(""); setForm({...emptyForm}); }} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
                <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">{saving ? "Salvando..." : "Criar OS"}</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
