"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import { ArrowLeft, Save, CheckCircle, Camera, Trash2, Plus, X, ClipboardList } from "lucide-react";
import clsx from "clsx";

const PRIORITY_BADGE: Record<string, string> = { critical: "bg-red-100 text-red-700", high: "bg-orange-100 text-orange-700", medium: "bg-amber-100 text-amber-700", low: "bg-green-100 text-green-700" };
const PRIORITY_LABEL: Record<string, string> = { critical: "Critica", high: "Alta", medium: "Media", low: "Baixa" };
const STATUS_BADGE: Record<string, string> = { pending: "bg-slate-100 text-slate-600", assigned: "bg-blue-100 text-blue-700", in_progress: "bg-indigo-100 text-indigo-700", paused: "bg-yellow-100 text-yellow-700", waiting_parts: "bg-orange-100 text-orange-700", waiting_approval: "bg-purple-100 text-purple-700", completed: "bg-green-100 text-green-700", cancelled: "bg-slate-100 text-slate-400" };
const STATUS_LABEL: Record<string, string> = { pending: "Pendente", assigned: "Atribuida", in_progress: "Em Execucao", paused: "Pausada", waiting_parts: "Ag. Pecas", completed: "Concluida", cancelled: "Cancelada", waiting_approval: "Ag. Aprovacao" };
const MAINTENANCE_LABEL: Record<string, string> = { preventive: "Preventiva", corrective: "Corretiva", emergency: "Emergencial", predictive: "Preditiva", inspection: "Inspecao", calibration: "Calibracao" };

const inp = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const lbl = "block text-sm font-medium text-slate-700 mb-1";

export default function WorkOrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [asset, setAsset] = useState<any>(null);
  const [subAsset, setSubAsset] = useState<any>(null);
  const [allAssets, setAllAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState<any>({});
  const [checklist, setChecklist] = useState<{ id: string; text: string; done: boolean }[]>([]);
  const [newTask, setNewTask] = useState("");

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get("/work-orders/" + id),
      api.get("/assets", { params: { limit: 100 } }),
    ]).then(([r, assetsRes]) => {
      const o = r.data;
      setOrder(o);
      setAllAssets(assetsRes.data);
      setForm({
        status: o.status || "pending",
        priority: o.priority || "medium",
        internal_hours: o.internal_hours ?? "",
        contractor_hours: o.contractor_hours ?? "",
        contractor_name: o.contractor_name || "",
        contractor_document: o.contractor_document || "",
        scheduled_start: o.scheduled_start ? o.scheduled_start.slice(0, 16) : "",
        scheduled_end: o.scheduled_end ? o.scheduled_end.slice(0, 16) : "",
        actual_start: o.actual_start ? o.actual_start.slice(0, 16) : "",
        actual_end: o.actual_end ? o.actual_end.slice(0, 16) : "",
        observations: o.observations || "",
        root_cause: o.root_cause || "",
        corrective_action: o.corrective_action || "",
      });
      // Carregar checklist do JSON
      if (o.checklist_progress && typeof o.checklist_progress === "object") {
        const items = Object.entries(o.checklist_progress).map(([key, val]: any) => ({
          id: key,
          text: val.text || key,
          done: val.done || false,
        }));
        setChecklist(items);
      }
      if (o.asset_id) {
        const found = assetsRes.data.find((a: any) => a.id === o.asset_id);
        if (found) setAsset(found);
      }
      if (o.sub_asset_id) {
        const found = assetsRes.data.find((a: any) => a.id === o.sub_asset_id);
        if (found) setSubAsset(found);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const buildChecklistPayload = (items: typeof checklist) => {
    const obj: Record<string, any> = {};
    items.forEach(item => { obj[item.id] = { text: item.text, done: item.done }; });
    return obj;
  };

  const handleSave = async () => {
    setSaving(true); setMsg("");
    try {
      const payload: any = { ...form };
      if (payload.internal_hours !== "") payload.internal_hours = parseFloat(payload.internal_hours);
      else delete payload.internal_hours;
      if (payload.contractor_hours !== "") payload.contractor_hours = parseFloat(payload.contractor_hours);
      else delete payload.contractor_hours;
      if (!payload.scheduled_start) delete payload.scheduled_start;
      if (!payload.scheduled_end) delete payload.scheduled_end;
      if (!payload.actual_start) delete payload.actual_start;
      if (!payload.actual_end) delete payload.actual_end;
      if (!payload.contractor_name) delete payload.contractor_name;
      if (!payload.contractor_document) delete payload.contractor_document;
      if (!payload.observations) delete payload.observations;
      if (!payload.root_cause) delete payload.root_cause;
      if (!payload.corrective_action) delete payload.corrective_action;
      payload.checklist_progress = buildChecklistPayload(checklist);
      await api.patch("/work-orders/" + id, payload);
      setMsg("Salvo com sucesso!");
      setTimeout(() => setMsg(""), 3000);
    } catch (e: any) {
      setMsg(e?.response?.data?.detail || "Erro ao salvar");
    } finally { setSaving(false); }
  };

  const handleComplete = async () => {
    if (!confirm("Confirmar conclusao da OS?")) return;
    setSaving(true); setMsg("");
    try {
      const payload: any = { ...form, status: "completed", actual_end: new Date().toISOString() };
      if (payload.internal_hours !== "") payload.internal_hours = parseFloat(payload.internal_hours);
      else delete payload.internal_hours;
      if (payload.contractor_hours !== "") payload.contractor_hours = parseFloat(payload.contractor_hours);
      else delete payload.contractor_hours;
      payload.checklist_progress = buildChecklistPayload(checklist);
      await api.patch("/work-orders/" + id, payload);
      setMsg("OS concluida com sucesso!");
      setTimeout(() => router.back(), 2000);
    } catch (e: any) {
      setMsg(e?.response?.data?.detail || "Erro ao concluir");
    } finally { setSaving(false); }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/work-orders/" + id + "/photos", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setOrder((prev: any) => ({ ...prev, photos: res.data.photos }));
      setMsg("Foto enviada com sucesso!");
      setTimeout(() => setMsg(""), 3000);
    } catch { setMsg("Erro ao enviar foto"); }
    finally { setUploading(false); }
  };

  const handlePhotoDelete = async (publicId: string) => {
    if (!confirm("Remover esta foto?")) return;
    try {
      const res = await api.delete("/work-orders/" + id + "/photos/" + publicId);
      setOrder((prev: any) => ({ ...prev, photos: res.data.photos }));
    } catch { setMsg("Erro ao remover foto"); }
  };

  const addChecklistItem = () => {
    if (!newTask.trim()) return;
    setChecklist([...checklist, { id: Date.now().toString(), text: newTask.trim(), done: false }]);
    setNewTask("");
  };

  const toggleChecklistItem = (itemId: string) => {
    setChecklist(checklist.map(item => item.id === itemId ? { ...item, done: !item.done } : item));
  };

  const removeChecklistItem = (itemId: string) => {
    setChecklist(checklist.filter(item => item.id !== itemId));
  };

  const checklistDone = checklist.filter(i => i.done).length;
  const checklistTotal = checklist.length;

  if (loading) return <div className="flex min-h-screen bg-slate-50"><Sidebar /><main className="flex-1 p-6 flex items-center justify-center text-slate-400">Carregando...</main></div>;
  if (!order) return <div className="flex min-h-screen bg-slate-50"><Sidebar /><main className="flex-1 p-6 flex items-center justify-center text-slate-400">OS nao encontrada</main></div>;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 text-sm">
          <ArrowLeft size={16} /> Voltar
        </button>

        <div className="flex items-start justify-between mb-6">
          <div>
            <span className="font-mono text-blue-700 font-bold text-lg">{order.number}</span>
            <h1 className="text-2xl font-bold text-slate-800">{order.title}</h1>
            <p className="text-slate-500 text-sm">
              {MAINTENANCE_LABEL[order.maintenance_type] || order.maintenance_type}
              {asset ? " — " + asset.name + " (" + asset.tag + ")" : ""}
              {subAsset ? " › " + subAsset.name : ""}
            </p>
            {order.description && <p className="text-slate-400 text-sm mt-1">{order.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            <span className={clsx("px-3 py-1 rounded-full text-xs font-medium", PRIORITY_BADGE[form.priority])}>
              {PRIORITY_LABEL[form.priority] || form.priority}
            </span>
            <span className={clsx("px-3 py-1 rounded-full text-sm font-medium", STATUS_BADGE[form.status])}>
              {STATUS_LABEL[form.status] || form.status}
            </span>
          </div>
        </div>

        {msg && (
          <div className={clsx("mb-4 px-4 py-3 rounded-lg text-sm font-medium", msg.includes("Erro") || msg.includes("Preencha") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700")}>
            {msg}
          </div>
        )}

        {/* Subativo vinculado */}
        {subAsset && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4 flex items-center gap-3">
            <ClipboardList size={16} className="text-indigo-600" />
            <div>
              <p className="text-sm font-medium text-indigo-800">Subativo: {subAsset.name}</p>
              <p className="text-xs text-indigo-600">Tag: {subAsset.tag} | Tipo: {subAsset.asset_type}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h2 className="font-semibold text-slate-700">Status e Prioridade</h2>
            <div>
              <label className={lbl}>Status</label>
              <select className={inp} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Prioridade</label>
              <select className={inp} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                {Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h2 className="font-semibold text-slate-700">Prazos</h2>
            <div><label className={lbl}>Inicio Previsto</label><input type="datetime-local" className={inp} value={form.scheduled_start} onChange={e => setForm({ ...form, scheduled_start: e.target.value })} /></div>
            <div><label className={lbl}>Fim Previsto</label><input type="datetime-local" className={inp} value={form.scheduled_end} onChange={e => setForm({ ...form, scheduled_end: e.target.value })} /></div>
            <div><label className={lbl}>Inicio Real</label><input type="datetime-local" className={inp} value={form.actual_start} onChange={e => setForm({ ...form, actual_start: e.target.value })} /></div>
            <div><label className={lbl}>Fim Real</label><input type="datetime-local" className={inp} value={form.actual_end} onChange={e => setForm({ ...form, actual_end: e.target.value })} /></div>
          </div>
        </div>

        {/* Execucao */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 space-y-4">
          <h2 className="font-semibold text-slate-700">Execucao</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={lbl}>Empresa Terceirizada</label><input className={inp} value={form.contractor_name} onChange={e => setForm({ ...form, contractor_name: e.target.value })} placeholder="Nome da empresa" /></div>
            <div><label className={lbl}>CNPJ</label><input className={inp} value={form.contractor_document} onChange={e => setForm({ ...form, contractor_document: e.target.value })} placeholder="00.000.000/0000-00" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={lbl}>Horas Internas</label><input type="number" step="0.5" className={inp} value={form.internal_hours} onChange={e => setForm({ ...form, internal_hours: e.target.value })} placeholder="Ex: 8" /></div>
            <div><label className={lbl}>Horas Terceirizadas</label><input type="number" step="0.5" className={inp} value={form.contractor_hours} onChange={e => setForm({ ...form, contractor_hours: e.target.value })} placeholder="Ex: 4" /></div>
          </div>
          <div><label className={lbl}>Observacoes</label><textarea className={inp} rows={2} value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} placeholder="Observacoes gerais da manutencao..." /></div>
        </div>

        {/* Checklist */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
              <ClipboardList size={15} className="text-slate-500" />
              Checklist
              {checklistTotal > 0 && (
                <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium", checklistDone === checklistTotal ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600")}>
                  {checklistDone}/{checklistTotal}
                </span>
              )}
            </h2>
          </div>
          {checklistTotal > 0 && (
            <div className="w-full bg-slate-100 rounded-full h-2 mb-3">
              <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${(checklistDone / checklistTotal) * 100}%` }} />
            </div>
          )}
          <div className="space-y-2 mb-3">
            {checklist.map(item => (
              <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => toggleChecklistItem(item.id)}
                  className="w-4 h-4 rounded accent-blue-600"
                />
                <span className={clsx("text-sm flex-1", item.done && "line-through text-slate-400")}>{item.text}</span>
                <button onClick={() => removeChecklistItem(item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                  <X size={14} />
                </button>
              </div>
            ))}
            {checklist.length === 0 && <p className="text-slate-400 text-sm py-2">Nenhuma tarefa adicionada.</p>}
          </div>
          <div className="flex gap-2">
            <input
              className={clsx(inp, "flex-1")}
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addChecklistItem()}
              placeholder="Nova tarefa... (Enter para adicionar)"
            />
            <button onClick={addChecklistItem} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">
              <Plus size={15} />
            </button>
          </div>
        </div>

        {/* Analise tecnica */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 space-y-4">
          <h2 className="font-semibold text-slate-700">Analise Tecnica</h2>
          <div><label className={lbl}>Causa Raiz</label><textarea className={inp} rows={2} value={form.root_cause} onChange={e => setForm({ ...form, root_cause: e.target.value })} placeholder="Descreva a causa raiz do problema..." /></div>
          <div><label className={lbl}>Acao Corretiva</label><textarea className={inp} rows={2} value={form.corrective_action} onChange={e => setForm({ ...form, corrective_action: e.target.value })} placeholder="Descreva a acao corretiva aplicada..." /></div>
        </div>

        {/* Fotos */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2"><Camera size={15}/> Fotos da Manutencao</h2>
            <label className={clsx("flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm cursor-pointer", uploading && "opacity-50 pointer-events-none")}>
              <Camera size={14}/>{uploading ? "Enviando..." : "Adicionar Foto"}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
            </label>
          </div>
          {(!order?.photos || order.photos.length === 0) ? (
            <p className="text-slate-400 text-sm">Nenhuma foto adicionada.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(order?.photos || []).map((p: any) => (
                <div key={p.public_id} className="relative group">
                  <img src={p.url} alt="foto" className="w-full h-32 object-cover rounded-lg border border-slate-200" />
                  <button onClick={() => handlePhotoDelete(p.public_id)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={12}/>
                  </button>
                  <p className="text-xs text-slate-400 mt-1">{new Date(p.uploaded_at).toLocaleDateString("pt-BR")}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
            <Save size={15} />{saving ? "Salvando..." : "Salvar Alteracoes"}
          </button>
          {form.status !== "completed" && form.status !== "cancelled" && (
            <button onClick={handleComplete} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
              <CheckCircle size={15} />Concluir OS
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
