"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import { Plus, Search, RefreshCw, X, ChevronRight, ChevronDown } from "lucide-react";
import clsx from "clsx";
const STATUS_BADGE: Record<string, string> = { operational: "bg-green-100 text-green-700", maintenance: "bg-amber-100 text-amber-700", failure: "bg-red-100 text-red-700", standby: "bg-slate-100 text-slate-600", decommissioned: "bg-gray-100 text-gray-400" };
const STATUS_LABEL: Record<string, string> = { operational: "Operacional", maintenance: "Manutencao", failure: "Falha", standby: "Reserva", decommissioned: "Desativado" };
const TYPE_LABEL: Record<string, string> = { substation: "Subestacao", generator: "Gerador", transformer: "Transformador", rectifier: "Retificador", inverter: "Inversor", switchgear: "Painel", catenary: "Catenaria", battery_bank: "Banco Baterias", circuit_breaker: "Disjuntor", measurement: "Medicao", cooling: "Refrigeracao", other: "Outro" };
const emptyForm = { tag: "", name: "", asset_type: "generator", status: "operational", manufacturer: "", model: "", serial_number: "", location_description: "", installation_date: "", notes: "", parent_id: "" };
export default function AssetsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<any>({...emptyForm});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const load = () => { setLoading(true); api.get("/assets", { params: { limit: 200 } }).then((r) => setAssets(r.data)).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);
  const roots = assets.filter(a => !a.parent_id).filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.tag.toLowerCase().includes(search.toLowerCase())).filter(a => !statusFilter || a.status === statusFilter).filter(a => !typeFilter || a.asset_type === typeFilter);
  const children = (parentId: string) => assets.filter(a => a.parent_id === parentId);
  const toggleExpand = (id: string) => { const s = new Set(expanded); s.has(id) ? s.delete(id) : s.add(id); setExpanded(s); };
  const openNew = (parentId?: string) => { setForm({...emptyForm, parent_id: parentId || ""}); setShowModal(true); };
  const handleSubmit = async () => {
    if (!form.tag || !form.name || !form.asset_type) { setError("Preencha Tag, Nome e Tipo"); return; }
    setSaving(true); setError("");
    try {
      const payload: any = { ...form, criticality: 3 };
      if (!payload.installation_date) delete payload.installation_date;
      if (!payload.manufacturer) delete payload.manufacturer;
      if (!payload.model) delete payload.model;
      if (!payload.serial_number) delete payload.serial_number;
      if (!payload.notes) delete payload.notes;
      if (!payload.parent_id) delete payload.parent_id;
      await api.post("/assets", payload);
      setShowModal(false); setForm({...emptyForm}); load();
    } catch (e: any) { setError(e?.response?.data?.detail || "Erro ao criar ativo");
    } finally { setSaving(false); }
  };
  const inp = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const lbl = "block text-sm font-medium text-slate-700 mb-1";
  const AssetRow = ({ a, depth }: { a: any, depth: number }) => {
    const kids = children(a.id);
    const isExpanded = expanded.has(a.id);
    return (<>
      <tr className="hover:bg-slate-50">
        <td className="px-4 py-3"><div style={{ paddingLeft: depth * 24 }} className="flex items-center gap-1">{kids.length > 0 ? <button onClick={() => toggleExpand(a.id)} className="text-slate-400 hover:text-slate-600">{isExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}</button> : <span className="w-4"/>}<span className="font-mono font-semibold text-blue-700">{a.tag}</span></div></td>
        <td className="px-4 py-3 font-medium text-slate-800">{a.name}{kids.length > 0 && <span className="ml-2 text-xs text-slate-400">({kids.length} subativos)</span>}</td>
        <td className="px-4 py-3 text-slate-500 text-sm">{TYPE_LABEL[a.asset_type] || a.asset_type}</td>
        <td className="px-4 py-3"><span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", STATUS_BADGE[a.status])}>{STATUS_LABEL[a.status] || a.status}</span></td>
        <td className="px-4 py-3 text-slate-500 text-sm">{a.manufacturer || "-"}</td>
        <td className="px-4 py-3 text-slate-500 text-sm">{a.model || "-"}</td>
        <td className="px-4 py-3 flex gap-2"><button className="text-blue-600 hover:underline text-xs">Ver</button><button onClick={() => openNew(a.id)} className="text-green-600 hover:underline text-xs">+ Sub</button></td>
      </tr>
      {isExpanded && kids.map(k => <AssetRow key={k.id} a={k} depth={depth+1} />)}
    </>);
  };
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="text-2xl font-bold text-slate-800">Ativos</h1><p className="text-slate-500 text-sm">{assets.length} registros</p></div>
          <button onClick={() => openNew()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"><Plus size={16} /> Novo Ativo</button>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none" placeholder="Buscar por nome ou tag..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">Todos os status</option>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}><option value="">Todos os tipos</option>{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <button onClick={load} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50"><RefreshCw size={15} className="text-slate-500" /></button>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200"><tr>{["Tag","Nome","Tipo","Status","Fabricante","Modelo","Acoes"].map((h) => (<th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>))}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (<tr><td colSpan={7} className="text-center py-10 text-slate-400">Carregando...</td></tr>
              ) : roots.length === 0 ? (<tr><td colSpan={7} className="text-center py-10 text-slate-400">Nenhum ativo encontrado</td></tr>
              ) : roots.map(a => <AssetRow key={a.id} a={a} depth={0} />)}
            </tbody>
          </table>
        </div>
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-800">{form.parent_id ? "Novo Subativo" : "Novo Ativo"}</h2>
                <button onClick={() => { setShowModal(false); setError(""); setForm({...emptyForm}); }} className="p-2 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
              </div>
              {form.parent_id && <div className="px-6 pt-3"><p className="text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">Subativo de: {assets.find(a => a.id === form.parent_id)?.name}</p></div>}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={lbl}>Tag *</label><input className={inp} value={form.tag} onChange={e => setForm({...form, tag: e.target.value})} placeholder="Ex: GER-001-A" /></div>
                  <div><label className={lbl}>Nome *</label><input className={inp} value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ex: Motor Diesel" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={lbl}>Tipo *</label><select className={inp} value={form.asset_type} onChange={e => setForm({...form, asset_type: e.target.value})}>{Object.entries(TYPE_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                  <div><label className={lbl}>Status</label><select className={inp} value={form.status} onChange={e => setForm({...form, status: e.target.value})}>{Object.entries(STATUS_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={lbl}>Fabricante</label><input className={inp} value={form.manufacturer} onChange={e => setForm({...form, manufacturer: e.target.value})} placeholder="Ex: Cummins" /></div>
                  <div><label className={lbl}>Modelo</label><input className={inp} value={form.model} onChange={e => setForm({...form, model: e.target.value})} placeholder="Ex: C1100D5" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={lbl}>Numero de Serie</label><input className={inp} value={form.serial_number} onChange={e => setForm({...form, serial_number: e.target.value})} placeholder="Ex: SN123456" /></div>
                  <div><label className={lbl}>Data de Instalacao</label><input type="date" className={inp} value={form.installation_date} onChange={e => setForm({...form, installation_date: e.target.value})} /></div>
                </div>
                <div><label className={lbl}>Localizacao</label><input className={inp} value={form.location_description} onChange={e => setForm({...form, location_description: e.target.value})} placeholder="Ex: Sala de maquinas - Bloco A" /></div>
                <div><label className={lbl}>Observacoes</label><textarea className={inp} rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Informacoes adicionais..." /></div>
                {error && <p className="text-red-600 text-sm">{error}</p>}
              </div>
              <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
                <button onClick={() => { setShowModal(false); setError(""); setForm({...emptyForm}); }} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
                <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">{saving ? "Salvando..." : form.parent_id ? "Criar Subativo" : "Criar Ativo"}</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
