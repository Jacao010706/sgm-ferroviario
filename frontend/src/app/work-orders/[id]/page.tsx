"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import { ArrowLeft, Save, CheckCircle, Camera, Trash2 } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<any>({});
  useEffect(() => {
    if (!id) return;
    api.get("/work-orders/" + id).then(async (r) => {
      setOrder(r.data);
      setForm({
        status: r.data.status || "pending",
        priority: r.data.priority || "medium",
        internal_hours: r.data.internal_hours ?? "",
        contractor_hours: r.data.contractor_hours ?? "",
        contractor_name: r.data.contractor_name || "",
        contractor_document: r.data.contractor_document || "",
        scheduled_start: r.data.scheduled_start ? r.data.scheduled_start.slice(0,16) : "",
        scheduled_end: r.data.scheduled_end ? r.data.scheduled_end.slice(0,16) : "",
        actual_start: r.data.actual_start ? r.data.actual_start.slice(0,16) : "",
        actual_end: r.data.actual_end ? r.data.actual_end.slice(0,16) : "",
        notes: r.data.notes || "",
        completion_notes: r.data.completion_notes || "",
      });
      if (r.data.asset_id) {
        api.get("/assets/" + r.data.asset_id).then(a => setAsset(a.data)).catch(() => {});
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);
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
      if (!payload.notes) delete payload.notes;
      if (!payload.completion_notes) delete payload.completion_notes;
      await api.patch("/work-orders/" + id, payload);
      setMsg("Salvo com sucesso!");
      setTimeout(() => setMsg(""), 3000);
    } catch (e: any) {
      setMsg(e?.response?.data?.detail || "Erro ao salvar");
    } finally { setSaving(false); }
  };
  const handleComplete = async () => {
    if (!form.completion_notes) { setMsg("Preencha o resultado da atividade antes de concluir"); return; }
    if (!confirm("Confirmar conclusao da OS?")) return;
    setSaving(true); setMsg("");
    try {
      await api.patch("/work-orders/" + id, { ...form, status: "completed", actual_end: new Date().toISOString() });
      setMsg("OS concluida com sucesso!");
      setTimeout(() => router.back(), 2000);
    } catch (e: any) {
      setMsg(e?.response?.data?.detail || "Erro ao concluir");
    } finally { setSaving(false); }
  };
  <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
  <div className="flex items-center justify-between mb-3">
    <h2 className="font-semibold text-slate-700 flex items-center gap-2"><Camera size={15}/> Fotos da Manutencao</h2>
    <label className={clsx("flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm cursor-pointer", uploading && "opacity-50 pointer-events-none")}>
      <Camera size={14}/>{uploading ? "Enviando..." : "Adicionar Foto"}
      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
    </label>
  </div>
  {(!order.photos || order.photos.length === 0) ? (
    <p className="text-slate-400 text-sm">Nenhuma foto adicionada.</p>
  ) : (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {order.photos.map((p: any) => (
        <div key={p.public_id} className="relative group">
          <img src={p.url} alt="foto" className="w-full h-32 object-cover rounded-lg border border-slate-200" />
          <button onClick={() => handlePhotoDelete(p.public_id)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button>
          <p className="text-xs text-slate-400 mt-1">{new Date(p.uploaded_at).toLocaleDateString("pt-BR")}</p>
        </div>
      ))}
    </div>
  )}
</div>
  if (loading) return <div className="flex min-h-screen bg-slate-50"><Sidebar /><main className="flex-1 p-6 flex items-center justify-center text-slate-400">Carregando...</main></div>;
  if (!order) return <div className="flex min-h-screen bg-slate-50"><Sidebar /><main className="flex-1 p-6 flex items-center justify-center text-slate-400">OS nao encontrada</main></div>;
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 text-sm"><ArrowLeft size={16} /> Voltar</button>
        <div className="flex items-start justify-between mb-6">
          <div>
            <span className="font-mono text-blue-700 font-bold text-lg">{order.number}</span>
            <h1 className="text-2xl font-bold text-slate-800">{order.title}</h1>
            <p className="text-slate-500 text-sm">{MAINTENANCE_LABEL[order.maintenance_type] || order.maintenance_type}{asset ? " — " + asset.name + " (" + asset.tag + ")" : ""}</p>
          </div>
          <span className={clsx("px-3 py-1 rounded-full text-sm font-medium", STATUS_BADGE[form.status])}>{STATUS_LABEL[form.status] || form.status}</span>
        </div>
        {msg && <div className={clsx("mb-4 px-4 py-3 rounded-lg text-sm font-medium", msg.includes("Erro") || msg.includes("Preencha") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700")}>{msg}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h2 className="font-semibold text-slate-700">Status e Prioridade</h2>
            <div><label className={lbl}>Status</label>
              <select className={inp} value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                {Object.entries(STATUS_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div><label className={lbl}>Prioridade</label>
              <select className={inp} value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                {Object.entries(PRIORITY_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h2 className="font-semibold text-slate-700">Prazos</h2>
            <div><label className={lbl}>Inicio Previsto</label><input type="datetime-local" className={inp} value={form.scheduled_start} onChange={e => setForm({...form, scheduled_start: e.target.value})} /></div>
            <div><label className={lbl}>Fim Previsto</label><input type="datetime-local" className={inp} value={form.scheduled_end} onChange={e => setForm({...form, scheduled_end: e.target.value})} /></div>
            <div><label className={lbl}>Inicio Real</label><input type="datetime-local" className={inp} value={form.actual_start} onChange={e => setForm({...form, actual_start: e.target.value})} /></div>
            <div><label className={lbl}>Fim Real</label><input type="datetime-local" className={inp} value={form.actual_end} onChange={e => setForm({...form, actual_end: e.target.value})} /></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 space-y-4">
          <h2 className="font-semibold text-slate-700">Execucao</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={lbl}>Empresa Terceirizada</label><input className={inp} value={form.contractor_name} onChange={e => setForm({...form, contractor_name: e.target.value})} placeholder="Nome da empresa" /></div>
            <div><label className={lbl}>CNPJ</label><input className={inp} value={form.contractor_document} onChange={e => setForm({...form, contractor_document: e.target.value})} placeholder="00.000.000/0000-00" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={lbl}>Horas Internas</label><input type="number" step="0.5" className={inp} value={form.internal_hours} onChange={e => setForm({...form, internal_hours: e.target.value})} placeholder="Ex: 8" /></div>
            <div><label className={lbl}>Horas Terceirizadas</label><input type="number" step="0.5" className={inp} value={form.contractor_hours} onChange={e => setForm({...form, contractor_hours: e.target.value})} placeholder="Ex: 4" /></div>
          </div>
          <div><label className={lbl}>Observacoes</label><textarea className={inp} rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Observacoes gerais..." /></div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <h2 className="font-semibold text-slate-700 mb-3">Resultado da Atividade</h2>
          <textarea className={inp} rows={4} value={form.completion_notes} onChange={e => setForm({...form, completion_notes: e.target.value})} placeholder="Descreva o que foi feito, pecas trocadas, observacoes tecnicas..." />
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"><Save size={15} />{saving ? "Salvando..." : "Salvar Alteracoes"}</button>
          {form.status !== "completed" && form.status !== "cancelled" && (
            <button onClick={handleComplete} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"><CheckCircle size={15} />Concluir OS</button>
          )}
        </div>
      </main>
    </div>
  );
}