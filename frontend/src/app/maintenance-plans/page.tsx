"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import { Plus, RefreshCw, X, PlayCircle, Calendar, Clock, CheckCircle, AlertTriangle, Search } from "lucide-react";
import clsx from "clsx";

const FREQUENCY_LABEL: Record<string, string> = {
  daily: "Diaria", weekly: "Semanal", biweekly: "Quinzenal",
  monthly: "Mensal", quarterly: "Trimestral", semiannual: "Semestral",
  annual: "Anual", biennial: "Bienal", custom_days: "Personalizado",
};

const PRIORITY_LABEL: Record<string, string> = {
  critical: "Critica", high: "Alta", medium: "Media", low: "Baixa",
};

const PRIORITY_BADGE: Record<string, string> = {
  critical: "bg-red-100 text-red-700", high: "bg-orange-100 text-orange-700",
  medium: "bg-amber-100 text-amber-700", low: "bg-green-100 text-green-700",
};

const TYPE_LABEL: Record<string, string> = {
  preventive: "Preventiva", corrective: "Corretiva", inspection: "Inspecao",
  calibration: "Calibracao", predictive: "Preditiva", emergency: "Emergencial",
};

const emptyForm = {
  name: "", description: "", asset_id: "", maintenance_type: "preventive",
  frequency: "monthly", frequency_days: "", estimated_duration_h: "1", priority: "medium",
};

function dueSoonColor(nextDue: string | null) {
  if (!nextDue) return "text-slate-400";
  const days = Math.ceil((new Date(nextDue).getTime() - Date.now()) / 86400000);
  if (days < 0) return "text-red-600 font-semibold";
  if (days <= 3) return "text-red-500";
  if (days <= 7) return "text-amber-500";
  return "text-green-600";
}

function dueSoonLabel(nextDue: string | null) {
  if (!nextDue) return "--";
  const days = Math.ceil((new Date(nextDue).getTime() - Date.now()) / 86400000);
  if (days < 0) return `Vencido (${Math.abs(days)}d)`;
  if (days === 0) return "Hoje!";
  if (days === 1) return "Amanha";
  return `${days} dias`;
}

export default function MaintenancePlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<any>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<string[]>([]);
  const [newCheckItem, setNewCheckItem] = useState("");
  const [requiredParts, setRequiredParts] = useState<string[]>([]);
  const [newPart, setNewPart] = useState("");
  const [showPartsSelector, setShowPartsSelector] = useState(false);
  const [showChecklistSelector, setShowChecklistSelector] = useState(false);
  const [availableChecklists, setAvailableChecklists] = useState<any[]>([]);
  const [checklistSearch, setChecklistSearch] = useState("");
  const [availableParts, setAvailableParts] = useState<any[]>([]);
  const [partsSearch, setPartsSearch] = useState("");

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get("/maintenance-plans/", { params: { is_active: true } }).then((r) => setPlans(r.data)),
      api.get("/assets/", { params: { limit: 100 } }).then((r) => setAssets(r.data)),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openChecklistSelector = () => {
    api.get("/checklists/", { params: { limit: 100 } }).then((r) => setAvailableChecklists(r.data));
    setChecklistSearch("");
    setShowChecklistSelector(true);
  };

  const importChecklist = (cl: any) => {
    const newItems = (cl.items || []).map((item: any) => typeof item === "string" ? item : item.text);
    const toAdd = newItems.filter((item: string) => !checklist.includes(item));
    setChecklist(prev => [...prev, ...toAdd]);
    setShowChecklistSelector(false);
  };

  const openPartsSelector = () => {
    api.get("/parts/", { params: { limit: 500 } }).then((r) => setAvailableParts(r.data));
    setPartsSearch("");
    setShowPartsSelector(true);
  };

  const togglePart = (part: any) => {
    const partStr = part.code + " - " + part.name;
    if (requiredParts.includes(partStr)) {
      setRequiredParts(requiredParts.filter(p => p !== partStr));
    } else {
      setRequiredParts(prev => [...prev, partStr]);
    }
  };

  const addCheckItem = () => {
    if (!newCheckItem.trim()) return;
    setChecklist(prev => [...prev, newCheckItem.trim()]);
    setNewCheckItem("");
  };

  const addPart = () => {
    if (!newPart.trim()) return;
    setRequiredParts(prev => [...prev, newPart.trim()]);
    setNewPart("");
  };

  const handleSubmit = async () => {
    if (!form.name || !form.asset_id || !form.maintenance_type) {
      setError("Preencha nome, ativo e tipo"); return;
    }
    setSaving(true); setError("");
    try {
      const payload: any = { ...form };
      payload.estimated_duration_h = parseFloat(payload.estimated_duration_h) || 1;
      if (payload.frequency !== "custom_days") delete payload.frequency_days;
      else payload.frequency_days = parseInt(payload.frequency_days) || 30;
      if (!payload.description) delete payload.description;
      payload.checklist = checklist.map((text, i) => ({ id: `item_${i}`, text, done: false }));
      payload.required_parts = requiredParts;
      await api.post("/maintenance-plans/", payload);
      setShowModal(false);
      setForm({ ...emptyForm });
      setChecklist([]);
      setRequiredParts([]);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Erro ao criar plano");
    } finally { setSaving(false); }
  };

  const generateWO = async (planId: string) => {
    if (!confirm("Gerar OS para este plano agora?")) return;
    setGenerating(planId);
    try {
      const res = await api.post(`/maintenance-plans/${planId}/generate-work-order`);
      alert(`OS gerada: ${res.data.number}`);
      load();
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Erro ao gerar OS");
    } finally { setGenerating(null); }
  };

  const deactivate = async (planId: string) => {
    if (!confirm("Desativar este plano?")) return;
    await api.delete(`/maintenance-plans/${planId}`).catch(() => {});
    load();
  };

  const closeModal = () => {
    setShowModal(false); setError("");
    setForm({ ...emptyForm }); setChecklist([]); setRequiredParts([]);
    setNewCheckItem(""); setNewPart("");
  };

  const inp = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const lbl = "block text-sm font-medium text-slate-700 mb-1";

  const overdueCount = plans.filter(p => p.next_due && new Date(p.next_due) < new Date()).length;
  const dueSoon7 = plans.filter(p => {
    if (!p.next_due) return false;
    const days = Math.ceil((new Date(p.next_due).getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= 7;
  }).length;

  const filteredAvailableParts = availableParts.filter(p =>
    !partsSearch || p.name.toLowerCase().includes(partsSearch.toLowerCase()) || p.code.toLowerCase().includes(partsSearch.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Planos de Manutencao</h1>
            <p className="text-slate-500 text-sm">Preventivas programadas</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <Plus size={15} /> Novo Plano
            </button>
            <button onClick={load} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 bg-white">
              <RefreshCw size={15} className="text-slate-500" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-100 p-4 flex gap-3 items-center shadow-sm">
            <div className="p-2 bg-blue-50 rounded-lg"><Calendar size={18} className="text-blue-600"/></div>
            <div><p className="text-2xl font-bold text-slate-800">{plans.length}</p><p className="text-xs text-slate-500">Planos Ativos</p></div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4 flex gap-3 items-center shadow-sm">
            <div className="p-2 bg-red-50 rounded-lg"><AlertTriangle size={18} className="text-red-600"/></div>
            <div><p className="text-2xl font-bold text-slate-800">{overdueCount}</p><p className="text-xs text-slate-500">Vencidos</p></div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4 flex gap-3 items-center shadow-sm">
            <div className="p-2 bg-amber-50 rounded-lg"><Clock size={18} className="text-amber-600"/></div>
            <div><p className="text-2xl font-bold text-slate-800">{dueSoon7}</p><p className="text-xs text-slate-500">Vencendo em 7 dias</p></div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4 flex gap-3 items-center shadow-sm">
            <div className="p-2 bg-green-50 rounded-lg"><CheckCircle size={18} className="text-green-600"/></div>
            <div><p className="text-2xl font-bold text-slate-800">{plans.length - overdueCount - dueSoon7}</p><p className="text-xs text-slate-500">Em Dia</p></div>
          </div>
        </div>

        <div className="space-y-3">
          {loading ? (
            <p className="text-center text-slate-400 py-10">Carregando...</p>
          ) : plans.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Calendar size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400">Nenhum plano de manutencao cadastrado</p>
              <button onClick={() => setShowModal(true)} className="mt-4 text-blue-600 text-sm hover:underline">Criar primeiro plano</button>
            </div>
          ) : plans.map((p) => {
            const asset = assets.find(a => a.id === p.asset_id);
            return (
              <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-slate-800">{p.name}</h3>
                      <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", PRIORITY_BADGE[p.priority])}>{PRIORITY_LABEL[p.priority]}</span>
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs">{TYPE_LABEL[p.maintenance_type] || p.maintenance_type}</span>
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">{FREQUENCY_LABEL[p.frequency] || p.frequency}</span>
                    </div>
                    {p.description && <p className="text-xs text-slate-500 mb-2">{p.description}</p>}
                    <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                      {asset && <span>Ativo: <strong className="text-slate-700">{asset.name}</strong></span>}
                      <span>Duracao: <strong className="text-slate-700">{p.estimated_duration_h}h</strong></span>
                      {p.checklist?.length > 0 && <span>{p.checklist.length} tarefas</span>}
                      {p.required_parts?.length > 0 && <span>{p.required_parts.length} pecas</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-400 mb-1">Proxima manutencao</p>
                    <p className={clsx("text-sm font-medium", dueSoonColor(p.next_due))}>
                      {p.next_due ? new Date(p.next_due).toLocaleDateString("pt-BR") : "--"}
                    </p>
                    <p className={clsx("text-xs", dueSoonColor(p.next_due))}>{dueSoonLabel(p.next_due)}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                  <button onClick={() => generateWO(p.id)} disabled={generating === p.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium">
                    <PlayCircle size={13} />{generating === p.id ? "Gerando..." : "Gerar OS"}
                  </button>
                  <button onClick={() => deactivate(p.id)} className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs">
                    Desativar
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-800">Novo Plano de Manutencao</h2>
                <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div><label className={lbl}>Nome *</label><input className={inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Manutencao Preventiva Mensal" /></div>
                <div><label className={lbl}>Descricao</label><textarea className={inp} rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Descricao do plano..." /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>Ativo *</label>
                    <select className={inp} value={form.asset_id} onChange={e => setForm({ ...form, asset_id: e.target.value })}>
                      <option value="">Selecione um ativo</option>
                      {assets.filter(a => !a.parent_id).map(a => <option key={a.id} value={a.id}>{a.name} ({a.tag})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Tipo *</label>
                    <select className={inp} value={form.maintenance_type} onChange={e => setForm({ ...form, maintenance_type: e.target.value })}>
                      {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>Frequencia *</label>
                    <select className={inp} value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}>
                      {Object.entries(FREQUENCY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  {form.frequency === "custom_days" ? (
                    <div><label className={lbl}>Intervalo (dias)</label><input type="number" className={inp} value={form.frequency_days} onChange={e => setForm({ ...form, frequency_days: e.target.value })} placeholder="Ex: 45" /></div>
                  ) : (
                    <div><label className={lbl}>Duracao Estimada (h)</label><input type="number" step="0.5" className={inp} value={form.estimated_duration_h} onChange={e => setForm({ ...form, estimated_duration_h: e.target.value })} /></div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {form.frequency === "custom_days" && (
                    <div><label className={lbl}>Duracao Estimada (h)</label><input type="number" step="0.5" className={inp} value={form.estimated_duration_h} onChange={e => setForm({ ...form, estimated_duration_h: e.target.value })} /></div>
                  )}
                  <div><label className={lbl}>Prioridade</label>
                    <select className={inp} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                      {Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <p className="text-sm font-semibold text-slate-700 mb-2">Checklist de Tarefas</p>
                  <div className="space-y-1 mb-2">
                    {checklist.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg">
                        <span className="text-sm flex-1">{item}</span>
                        <button type="button" onClick={() => setChecklist(checklist.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-500"><X size={13} /></button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input className={clsx(inp, "flex-1")} value={newCheckItem} onChange={e => setNewCheckItem(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCheckItem(); }}}
                      placeholder="Nova tarefa... (Enter para adicionar)" />
                    <button type="button" onClick={addCheckItem} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"><Plus size={14} /></button>
                    <button type="button" onClick={openChecklistSelector} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"><Search size={14} /> Buscar</button>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <p className="text-sm font-semibold text-slate-700 mb-2">Pecas Necessarias</p>
                  <div className="space-y-1 mb-2">
                    {requiredParts.map((part, i) => (
                      <div key={i} className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg">
                        <span className="text-sm flex-1">{part}</span>
                        <button type="button" onClick={() => setRequiredParts(requiredParts.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-500"><X size={13} /></button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input className={clsx(inp, "flex-1")} value={newPart} onChange={e => setNewPart(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addPart(); }}}
                      placeholder="Digite manualmente ou use Buscar..." />
                    <button type="button" onClick={addPart} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"><Plus size={14} /></button>
                    <button type="button" onClick={openPartsSelector} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"><Search size={14} /> Buscar</button>
                  </div>
                </div>

                {error && <p className="text-red-600 text-sm">{error}</p>}
              </div>
              <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
                <button type="button" onClick={closeModal} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
                <button type="button" onClick={handleSubmit} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">{saving ? "Salvando..." : "Criar Plano"}</button>
              </div>
            </div>
          </div>
        )}

        {showChecklistSelector && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{maxHeight: "80vh"}}>
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-800">Importar Checklist</h3>
                <button onClick={() => setShowChecklistSelector(false)}><X size={18} className="text-slate-400 hover:text-slate-600" /></button>
              </div>
              <div className="p-4 border-b border-slate-100">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Buscar checklist..." value={checklistSearch} onChange={e => setChecklistSearch(e.target.value)} autoFocus />
                </div>
              </div>
              <div className="overflow-auto flex-1 p-2">
                {availableChecklists.filter(cl => !checklistSearch || cl.name.toLowerCase().includes(checklistSearch.toLowerCase()) || (cl.category || "").toLowerCase().includes(checklistSearch.toLowerCase())).map(cl => (
                  <div key={cl.id} onClick={() => importChecklist(cl)} className="flex items-start gap-3 px-3 py-3 rounded-lg cursor-pointer hover:bg-slate-50 border border-transparent hover:border-slate-200 mb-1">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-slate-800">{cl.name}</p>
                        {cl.category && <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">{cl.category}</span>}
                      </div>
                      {cl.description && <p className="text-xs text-slate-400 mb-1">{cl.description}</p>}
                      <p className="text-xs text-slate-500">{(cl.items || []).length} tarefas</p>
                    </div>
                    <span className="text-xs text-blue-600 font-medium mt-1 shrink-0">Importar</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {showPartsSelector && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{maxHeight: "80vh"}}>
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-800">Selecionar Pecas</h3>
                <button onClick={() => setShowPartsSelector(false)}><X size={18} className="text-slate-400 hover:text-slate-600" /></button>
              </div>
              <div className="p-4 border-b border-slate-100">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Buscar peca por nome ou codigo..." value={partsSearch} onChange={e => setPartsSearch(e.target.value)} autoFocus />
                </div>
              </div>
              <div className="overflow-auto flex-1 p-2">
                {filteredAvailableParts.length === 0 ? (
                  <p className="text-center text-slate-400 py-8 text-sm">Nenhuma peca encontrada</p>
                ) : filteredAvailableParts.map(p => {
                  const partStr = p.code + " - " + p.name;
                  const selected = requiredParts.includes(partStr);
                  return (
                    <div key={p.id} onClick={() => togglePart(p)} className={clsx("flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors", selected && "bg-blue-50")}>
                      <div className={clsx("w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors", selected ? "bg-blue-600 border-blue-600" : "border-slate-300")}>
                        {selected && <span className="text-white text-xs font-bold">âœ“</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
                        <p className="text-xs text-slate-400">{p.code}{p.category ? " Â· " + p.category : ""}{p.description ? " Â· " + p.description.slice(0, 50) : ""}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-sm text-slate-500">{requiredParts.length} peca(s) selecionada(s)</span>
                <button onClick={() => setShowPartsSelector(false)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">Confirmar</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}




