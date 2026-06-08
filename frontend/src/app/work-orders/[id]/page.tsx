"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import { ArrowLeft, Save, CheckCircle, Camera, Trash2, Plus, X, ClipboardList, Package, Download, Printer, Fuel, Building2, User, ChevronDown } from "lucide-react";
import clsx from "clsx";

const PRIORITY_BADGE: Record<string, string> = { critical: "bg-red-100 text-red-700", high: "bg-orange-100 text-orange-700", medium: "bg-amber-100 text-amber-700", low: "bg-green-100 text-green-700" };
const PRIORITY_LABEL: Record<string, string> = { critical: "Critica", high: "Alta", medium: "Media", low: "Baixa" };
const STATUS_BADGE: Record<string, string> = { pending: "bg-slate-100 text-slate-600", assigned: "bg-blue-100 text-blue-700", in_progress: "bg-indigo-100 text-indigo-700", paused: "bg-yellow-100 text-yellow-700", waiting_parts: "bg-orange-100 text-orange-700", waiting_approval: "bg-purple-100 text-purple-700", completed: "bg-green-100 text-green-700", cancelled: "bg-slate-100 text-slate-400" };
const STATUS_LABEL: Record<string, string> = { pending: "Pendente", assigned: "Atribuida", in_progress: "Em Execucao", paused: "Pausada", waiting_parts: "Ag. Pecas", completed: "Concluida", cancelled: "Cancelada", waiting_approval: "Ag. Aprovacao" };
const MAINTENANCE_LABEL: Record<string, string> = { preventive: "Preventiva", corrective: "Corretiva", emergency: "Emergencial", predictive: "Preditiva", inspection: "Inspecao", calibration: "Calibracao" };

const inp = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const lbl = "block text-sm font-medium text-slate-700 mb-1";

interface ChecklistItem { id: string; text: string; done: boolean; }
interface ContractedCompany { id: number; name: string; cnpj?: string; }
interface Material { id: string; name: string; quantity: string; unit: string; }

function PrintView({ order, asset, subAsset, form, checklist, materials }: any) {
  const now = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const checklistDone = checklist.filter((i: ChecklistItem) => i.done).length;
  const isFuelOS = order.title?.toLowerCase().includes("abastecimento") || order.title?.toLowerCase().includes("combustivel");

  return (
    <div id="print-area" style={{ display: "none" }}>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; }
          @page { margin: 15mm; size: A4; }
        }
        #print-area { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: white; padding: 0; font-size: 11px; line-height: 1.5; }
        .print-header { background: #1E3A5F; color: white; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-radius: 6px; }
        .print-header h1 { margin: 0; font-size: 20px; font-weight: 700; }
        .print-header p { margin: 2px 0 0; font-size: 11px; opacity: 0.8; }
        .os-number { font-size: 28px; font-weight: 800; font-family: monospace; }
        .print-title { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
        .print-subtitle { font-size: 11px; color: #64748b; margin-bottom: 16px; }
        .badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; }
        .badge-critical { background: #fee2e2; color: #dc2626; }
        .badge-high { background: #ffedd5; color: #ea580c; }
        .badge-medium { background: #fef3c7; color: #d97706; }
        .badge-low { background: #dcfce7; color: #16a34a; }
        .badge-default { background: #f1f5f9; color: #64748b; }
        .print-section { border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 12px; overflow: hidden; }
        .print-section-header { background: #f8fafc; padding: 8px 14px; font-weight: 700; font-size: 11px; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
        .print-section-body { padding: 12px 14px; }
        .print-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .print-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
        .print-grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; }
        .print-field label { font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 2px; }
        .print-field span { font-size: 12px; font-weight: 600; color: #1e293b; }
        .print-field span.empty { color: #cbd5e1; font-weight: 400; font-style: italic; }
        .checklist-item { display: flex; align-items: center; gap: 8px; padding: 5px 0; border-bottom: 1px solid #f1f5f9; }
        .checklist-item:last-child { border-bottom: none; }
        .checkbox { width: 14px; height: 14px; border: 2px solid #cbd5e1; border-radius: 3px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .checkbox.done { background: #22c55e; border-color: #22c55e; color: white; font-size: 9px; }
        .material-table { width: 100%; border-collapse: collapse; font-size: 11px; }
        .material-table th { background: #f8fafc; padding: 6px 10px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; border-bottom: 1px solid #e2e8f0; }
        .material-table td { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; }
        .fuel-banner { background: #eff6ff; border: 2px solid #2563eb; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px; display: flex; align-items: center; gap: 12px; }
        .fuel-banner .fuel-value { font-size: 28px; font-weight: 800; color: #1d4ed8; }
        .fuel-banner .fuel-label { font-size: 11px; color: #3b82f6; }
        .print-signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 20px; }
        .signature-box { border-top: 2px solid #334155; padding-top: 8px; text-align: center; }
        .signature-box p { font-size: 9px; color: #64748b; margin: 0; }
        .print-footer { margin-top: 16px; padding-top: 10px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; }
        .divider { height: 1px; background: #e2e8f0; margin: 8px 0; }
        .progress-bar-bg { background: #f1f5f9; border-radius: 4px; height: 6px; margin-top: 4px; }
        .progress-bar-fill { background: #22c55e; border-radius: 4px; height: 6px; }
      `}</style>

      <div className="print-header">
        <div>
          <h1>SGM Ferroviario</h1>
          <p>Sistema de Gestao de Manutencao Ferroviaria</p>
          <p style={{ marginTop: 6, fontSize: 10, opacity: 0.6 }}>Emitido em: {now}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 4 }}>ORDEM DE SERVICO</div>
          <div className="os-number">{order.number}</div>
          <div style={{ marginTop: 6, display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <span className={`badge badge-${form.priority}`}>{PRIORITY_LABEL[form.priority] || form.priority}</span>
            <span className={`badge badge-default`}>{STATUS_LABEL[form.status] || form.status}</span>
          </div>
        </div>
      </div>

      <div className="print-title">{order.title}</div>
      <div className="print-subtitle">
        {MAINTENANCE_LABEL[order.maintenance_type] || order.maintenance_type}
        {asset ? ` — ${asset.name} (${asset.tag})` : ""}
        {subAsset ? ` › ${subAsset.name}` : ""}
        {order.description ? ` · ${order.description}` : ""}
      </div>

      {/* Banner de abastecimento se OS de combustivel */}
      {isFuelOS && form.fuel_liters_added && (
        <div className="fuel-banner">
          <div>
            <div className="fuel-value">{form.fuel_liters_added}L</div>
            <div className="fuel-label">Combustivel Abastecido</div>
          </div>
          <div style={{ fontSize: 11, color: "#1e40af" }}>
            <p>Ativo: <strong>{asset?.name || "—"}</strong></p>
            <p>Data: <strong>{form.actual_end ? new Date(form.actual_end).toLocaleDateString("pt-BR") : new Date().toLocaleDateString("pt-BR")}</strong></p>
          </div>
        </div>
      )}

      <div className="print-section">
        <div className="print-section-header">Informacoes Gerais</div>
        <div className="print-section-body">
          <div className="print-grid-3">
            <div className="print-field"><label>Tipo de Manutencao</label><span>{MAINTENANCE_LABEL[order.maintenance_type] || "—"}</span></div>
            <div className="print-field"><label>Ativo</label><span>{asset ? `${asset.name} (${asset.tag})` : "—"}</span></div>
            <div className="print-field"><label>Subativo</label><span>{subAsset ? subAsset.name : <span className="empty">Nao informado</span>}</span></div>
          </div>
          <div className="divider" />
          <div className="print-grid-4">
            <div className="print-field"><label>Inicio Previsto</label><span>{form.scheduled_start ? new Date(form.scheduled_start).toLocaleString("pt-BR") : <span className="empty">—</span>}</span></div>
            <div className="print-field"><label>Fim Previsto</label><span>{form.scheduled_end ? new Date(form.scheduled_end).toLocaleString("pt-BR") : <span className="empty">—</span>}</span></div>
            <div className="print-field"><label>Inicio Real</label><span>{form.actual_start ? new Date(form.actual_start).toLocaleString("pt-BR") : <span className="empty">—</span>}</span></div>
            <div className="print-field"><label>Fim Real</label><span>{form.actual_end ? new Date(form.actual_end).toLocaleString("pt-BR") : <span className="empty">—</span>}</span></div>
          </div>
        </div>
      </div>

      <div className="print-section">
        <div className="print-section-header">Execucao</div>
        <div className="print-section-body">
          <div className="print-grid">
            <div className="print-field"><label>Empresa Terceirizada</label><span>{form.contractor_name || <span className="empty">Nao informado</span>}</span></div>
            <div className="print-field"><label>Tecnico Preposto</label><span>{form.contractor_preposto || <span className="empty">Nao informado</span>}</span></div>
            <div className="print-field"><label>Horas Internas</label><span>{form.internal_hours ? `${form.internal_hours}h` : <span className="empty">—</span>}</span></div>
            <div className="print-field"><label>Horas Terceirizadas</label><span>{form.contractor_hours ? `${form.contractor_hours}h` : <span className="empty">—</span>}</span></div>
          </div>
          {form.fuel_liters_added && (
            <>
              <div className="divider" />
              <div className="print-field"><label>⛽ Combustivel Abastecido</label><span style={{ color: "#1d4ed8", fontSize: 14 }}>{form.fuel_liters_added} litros</span></div>
            </>
          )}
          {form.observations && (<><div className="divider" /><div className="print-field"><label>Observacoes</label><span style={{ whiteSpace: "pre-wrap", fontWeight: 400, fontSize: 11 }}>{form.observations}</span></div></>)}
        </div>
      </div>

      {(form.root_cause || form.corrective_action) && (
        <div className="print-section">
          <div className="print-section-header">Analise Tecnica</div>
          <div className="print-section-body">
            <div className="print-grid">
              {form.root_cause && <div className="print-field"><label>Causa Raiz</label><span style={{ whiteSpace: "pre-wrap", fontWeight: 400, fontSize: 11 }}>{form.root_cause}</span></div>}
              {form.corrective_action && <div className="print-field"><label>Acao Corretiva</label><span style={{ whiteSpace: "pre-wrap", fontWeight: 400, fontSize: 11 }}>{form.corrective_action}</span></div>}
            </div>
          </div>
        </div>
      )}

      {checklist.filter((i: ChecklistItem) => i.done).length > 0 && (
        <div className="print-section">
          <div className="print-section-header">
            <span>Checklist de Atividades</span>
            <span style={{ fontWeight: 600, color: "#16a34a" }}>{checklistDone}/{checklist.length} concluidos</span>
          </div>
          <div className="print-section-body" style={{ paddingBottom: 8 }}>
            <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${checklist.length > 0 ? (checklistDone / checklist.length) * 100 : 0}%` }} /></div>
            <div style={{ marginTop: 10 }}>
              {checklist.filter((item: ChecklistItem) => item.done).map((item: ChecklistItem) => (
                <div key={item.id} className="checklist-item">
                  <div className="checkbox done">✓</div>
                  <span style={{ fontSize: 11 }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {materials.length > 0 && (
        <div className="print-section">
          <div className="print-section-header">Materiais Utilizados</div>
          <div className="print-section-body" style={{ padding: 0 }}>
            <table className="material-table">
              <thead><tr><th>#</th><th>Material / Peca</th><th>Quantidade</th><th>Unidade</th></tr></thead>
              <tbody>
                {materials.map((mat: Material, i: number) => (
                  <tr key={mat.id}><td style={{ color: "#94a3b8", width: 30 }}>{i + 1}</td><td style={{ fontWeight: 600 }}>{mat.name}</td><td>{mat.quantity}</td><td>{mat.unit}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="print-signatures">
        <div className="signature-box"><p>Responsavel pela Execucao</p><p style={{ marginTop: 2, fontWeight: 600, color: "#334155" }}>&nbsp;</p></div>
        <div className="signature-box"><p>Supervisor / Aprovador</p><p style={{ marginTop: 2, fontWeight: 600, color: "#334155" }}>&nbsp;</p></div>
        <div className="signature-box"><p>Data de Conclusao</p><p style={{ marginTop: 2, fontWeight: 600, color: "#334155" }}>&nbsp;</p></div>
      </div>

      <div className="print-footer">
        <span>SGM Ferroviario — Sistema de Gestao de Manutencao</span>
        <span>OS: {order.number} | Impresso em: {now}</span>
      </div>
    </div>
  );
}

export default function WorkOrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [asset, setAsset] = useState<any>(null);
  const [subAsset, setSubAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState<any>({});
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newTask, setNewTask] = useState("");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [newMaterial, setNewMaterial] = useState({ name: "", quantity: "1", unit: "un" });
  const [showImportModal, setShowImportModal] = useState(false);
  const [companies, setCompanies] = useState<ContractedCompany[]>([]);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyCnpj, setNewCompanyCnpj] = useState("");
  const [savingCompany, setSavingCompany] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [importMode, setImportMode] = useState<"replace" | "append">("append");

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get("/work-orders/" + id),
      api.get("/assets/", { params: { limit: 100 } }),
    ]).then(([r, assetsRes]) => {
      const o = r.data;
      setOrder(o);
      setForm({
        status: o.status || "pending",
        priority: o.priority || "medium",
        internal_hours: o.internal_hours ?? "",
        contractor_hours: o.contractor_hours ?? "",
        contractor_name: o.contractor_name || "",
        contractor_document: o.contractor_document || "",
        contractor_preposto: o.contractor_preposto || "",
        scheduled_start: o.scheduled_start ? o.scheduled_start.slice(0, 16) : "",
        scheduled_end: o.scheduled_end ? o.scheduled_end.slice(0, 16) : "",
        actual_start: o.actual_start ? o.actual_start.slice(0, 16) : "",
        actual_end: o.actual_end ? o.actual_end.slice(0, 16) : "",
        observations: o.observations || "",
        root_cause: o.root_cause || "",
        corrective_action: o.corrective_action || "",
        fuel_liters_added: o.fuel_liters_added ?? "",
      });
      if (o.checklist_progress && typeof o.checklist_progress === "object") {
        const items = Object.entries(o.checklist_progress).map(([key, val]: any) => ({ id: key, text: val.text || key, done: val.done || false }));
        setChecklist(items);
      }
      if (o.parts_used && Array.isArray(o.parts_used)) {
        setMaterials(o.parts_used.map((p: any, i: number) => ({ id: p.id || `mat_${i}`, name: p.name || p, quantity: p.quantity || "1", unit: p.unit || "un" })));
      }
      const allAssets = assetsRes.data;
      const found = allAssets.find((a: any) => a.id === o.asset_id);
      if (found) setAsset(found);
      if (o.sub_asset_id) { const sub = allAssets.find((a: any) => a.id === o.sub_asset_id); if (sub) setSubAsset(sub); }
    }).catch(console.error).finally(() => setLoading(false));
    api.get("/contracted-companies/").then(r => setCompanies(r.data)).catch(() => {});
  }, [id]);

  const handlePrint = () => {
    const printArea = document.getElementById("print-area");
    if (printArea) {
      printArea.style.display = "block";
      setTimeout(() => { window.print(); printArea.style.display = "none"; }, 100);
    }
  };

  const openImportModal = () => {
    setShowImportModal(true); setSelectedTemplate(""); setLoadingTemplates(true);
    api.get("/checklists/").then((r) => setTemplates(r.data)).catch(() => setTemplates([])).finally(() => setLoadingTemplates(false));
  };

  const handleImport = () => {
    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return;
    const newItems: ChecklistItem[] = template.items.map((item: any) => ({ id: Date.now().toString() + Math.random().toString(36).slice(2), text: item.text || item, done: false }));
    if (importMode === "replace") setChecklist(newItems); else setChecklist(prev => [...prev, ...newItems]);
    setShowImportModal(false);
    setMsg(`Checklist "${template.name}" importado!`);
    setTimeout(() => setMsg(""), 3000);
  };

  const buildChecklistPayload = (items: ChecklistItem[]) => {
    const obj: Record<string, any> = {};
    items.forEach(item => { obj[item.id] = { text: item.text, done: item.done }; });
    return obj;
  };

  const handleSave = async () => {
    setSaving(true); setMsg("");
    try {
      const payload: any = { ...form };
      if (payload.internal_hours !== "") payload.internal_hours = parseFloat(payload.internal_hours); else delete payload.internal_hours;
      if (payload.contractor_hours !== "") payload.contractor_hours = parseFloat(payload.contractor_hours); else delete payload.contractor_hours;
      if (payload.fuel_liters_added !== "") payload.fuel_liters_added = parseFloat(payload.fuel_liters_added); else delete payload.fuel_liters_added;
      if (!payload.scheduled_start) delete payload.scheduled_start;
      if (!payload.scheduled_end) delete payload.scheduled_end;
      if (!payload.actual_start) delete payload.actual_start;
      if (!payload.actual_end) delete payload.actual_end;
      if (!payload.contractor_name) delete payload.contractor_name;
      if (!payload.contractor_document) delete payload.contractor_document;
      if (!payload.contractor_preposto) delete payload.contractor_preposto;
      if (!payload.observations) delete payload.observations;
      if (!payload.root_cause) delete payload.root_cause;
      if (!payload.corrective_action) delete payload.corrective_action;
      payload.checklist_progress = buildChecklistPayload(checklist);
      payload.parts_used = materials.map(m => ({ id: m.id, name: m.name, quantity: m.quantity, unit: m.unit }));
      await api.patch("/work-orders/" + id, payload);
      setMsg("Salvo com sucesso!");
      setTimeout(() => setMsg(""), 3000);
    } catch (e: any) { setMsg(e?.response?.data?.detail || "Erro ao salvar"); } finally { setSaving(false); }
  };

  const handleComplete = async () => {
    if (!confirm("Confirmar conclusao da OS?")) return;
    setSaving(true); setMsg("");
    try {
      const payload: any = { ...form, status: "completed", actual_end: new Date().toISOString() };
      if (payload.internal_hours !== "") payload.internal_hours = parseFloat(payload.internal_hours); else delete payload.internal_hours;
      if (payload.contractor_hours !== "") payload.contractor_hours = parseFloat(payload.contractor_hours); else delete payload.contractor_hours;
      if (payload.fuel_liters_added !== "") payload.fuel_liters_added = parseFloat(payload.fuel_liters_added); else delete payload.fuel_liters_added;
      payload.checklist_progress = buildChecklistPayload(checklist);
      payload.parts_used = materials.map(m => ({ id: m.id, name: m.name, quantity: m.quantity, unit: m.unit }));
      await api.patch("/work-orders/" + id, payload);
      setMsg("OS concluida!");
      setTimeout(() => router.back(), 2000);
    } catch (e: any) { setMsg(e?.response?.data?.detail || "Erro ao concluir"); } finally { setSaving(false); }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData(); formData.append("file", file);
      const res = await api.post("/work-orders/" + id + "/photos", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setOrder((prev: any) => ({ ...prev, photos: res.data.photos }));
      setMsg("Foto enviada!"); setTimeout(() => setMsg(""), 3000);
    } catch { setMsg("Erro ao enviar foto"); } finally { setUploading(false); }
  };

  const handlePhotoDelete = async (publicId: string) => {
    if (!confirm("Remover esta foto?")) return;
    try {
      const res = await api.delete("/work-orders/" + id + "/photos/" + publicId);
      setOrder((prev: any) => ({ ...prev, photos: res.data.photos }));
    } catch { setMsg("Erro ao remover foto"); }
  };

  const addChecklistItem = () => { if (!newTask.trim()) return; setChecklist([...checklist, { id: Date.now().toString(), text: newTask.trim(), done: false }]); setNewTask(""); };
  const toggleChecklistItem = (itemId: string) => setChecklist(checklist.map(i => i.id === itemId ? { ...i, done: !i.done } : i));
  const removeChecklistItem = (itemId: string) => setChecklist(checklist.filter(i => i.id !== itemId));
  const addMaterial = () => { if (!newMaterial.name.trim()) return; setMaterials([...materials, { id: Date.now().toString(), ...newMaterial }]); setNewMaterial({ name: "", quantity: "1", unit: "un" }); };
  const removeMaterial = (matId: string) => setMaterials(materials.filter(m => m.id !== matId));
  const updateMaterial = (matId: string, field: string, value: string) => setMaterials(materials.map(m => m.id === matId ? { ...m, [field]: value } : m));

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) return;
    setSavingCompany(true);
    try {
      const res = await api.post("/contracted-companies/", { name: newCompanyName.trim(), cnpj: newCompanyCnpj.trim() || null });
      setCompanies(prev => [...prev, res.data]);
      setForm((prev: any) => ({ ...prev, contractor_name: res.data.name }));
      setNewCompanyName("");
      setNewCompanyCnpj("");
      setShowCompanyModal(false);
      setMsg("Empresa cadastrada e selecionada!");
      setTimeout(() => setMsg(""), 3000);
    } catch { setMsg("Erro ao cadastrar empresa"); } finally { setSavingCompany(false); }
  };

  const checklistDone = checklist.filter(i => i.done).length;
  const checklistTotal = checklist.length;
  const isFuelOS = order?.title?.toLowerCase().includes("abastecimento") || order?.title?.toLowerCase().includes("combustivel");

  if (loading) return <div className="flex min-h-screen bg-slate-50"><Sidebar /><main className="flex-1 p-6 flex items-center justify-center text-slate-400">Carregando...</main></div>;
  if (!order) return <div className="flex min-h-screen bg-slate-50"><Sidebar /><main className="flex-1 p-6 flex items-center justify-center text-slate-400">OS nao encontrada</main></div>;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        {order && <PrintView order={order} asset={asset} subAsset={subAsset} form={form} checklist={checklist} materials={materials} />}

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
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium transition-colors">
              <Printer size={15} /> Imprimir OS
            </button>
            <span className={clsx("px-3 py-1 rounded-full text-xs font-medium", PRIORITY_BADGE[form.priority])}>{PRIORITY_LABEL[form.priority] || form.priority}</span>
            <span className={clsx("px-3 py-1 rounded-full text-sm font-medium", STATUS_BADGE[form.status])}>{STATUS_LABEL[form.status] || form.status}</span>
          </div>
        </div>

        {msg && (
          <div className={clsx("mb-4 px-4 py-3 rounded-lg text-sm font-medium", msg.includes("Erro") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700")}>{msg}</div>
        )}

        {subAsset && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4 flex items-center gap-3">
            <ClipboardList size={16} className="text-indigo-600" />
            <div>
              <p className="text-sm font-medium text-indigo-800">Subativo: {subAsset.name}</p>
              <p className="text-xs text-indigo-600">Tag: {subAsset.tag} | Tipo: {subAsset.asset_type}</p>
            </div>
          </div>
        )}

        {/* Banner OS de abastecimento */}
        {isFuelOS && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex items-center gap-3">
            <Fuel size={18} className="text-blue-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-800">OS de Abastecimento de Combustivel</p>
              <p className="text-xs text-blue-600">Informe a quantidade de litros abastecidos no campo abaixo.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h2 className="font-semibold text-slate-700">Status e Prioridade</h2>
            <div><label className={lbl}>Status</label>
              <select className={inp} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div><label className={lbl}>Prioridade</label>
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

        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 space-y-4">
          <h2 className="font-semibold text-slate-700">Execucao</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Empresa Terceirizada</label>
              <div className="flex gap-2">
                <input className={inp} value={form.contractor_name} onChange={e => setForm({ ...form, contractor_name: e.target.value })} placeholder="Nome da empresa" />
                <button type="button" onClick={() => setShowCompanyModal(true)} title="Selecionar empresa cadastrada" className="flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-600 transition-colors">
                  <Building2 size={15} /><ChevronDown size={12} />
                </button>
              </div>
            </div>
            <div>
              <label className={lbl}>Tecnico Preposto</label>
              <div className="flex gap-2 items-center">
                <User size={15} className="text-slate-400 shrink-0" />
                <input className={inp} value={form.contractor_preposto || ""} onChange={e => setForm({ ...form, contractor_preposto: e.target.value })} placeholder="Nome e funcao do preposto" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={lbl}>Horas Internas</label><input type="number" step="0.5" className={inp} value={form.internal_hours} onChange={e => setForm({ ...form, internal_hours: e.target.value })} placeholder="Ex: 8" /></div>
            <div><label className={lbl}>Horas Terceirizadas</label><input type="number" step="0.5" className={inp} value={form.contractor_hours} onChange={e => setForm({ ...form, contractor_hours: e.target.value })} placeholder="Ex: 4" /></div>
          </div>

          {/* Campo combustivel — sempre visivel, destaque se for OS de abastecimento */}
          <div className={clsx("rounded-xl p-4 border", isFuelOS ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200")}>
            <label className={clsx("flex items-center gap-2 text-sm font-medium mb-2", isFuelOS ? "text-blue-800" : "text-slate-700")}>
              <Fuel size={15} className={isFuelOS ? "text-blue-600" : "text-slate-500"} />
              Combustivel Abastecido (litros)
              {isFuelOS && <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">Obrigatorio para esta OS</span>}
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              className={clsx(inp, isFuelOS ? "border-blue-300 focus:ring-blue-500 bg-white" : "")}
              value={form.fuel_liters_added}
              onChange={e => setForm({ ...form, fuel_liters_added: e.target.value })}
              placeholder="Ex: 150.5"
            />
            {isFuelOS && <p className="text-xs text-blue-600 mt-1">Informe a quantidade exata de litros abastecidos no gerador.</p>}
          </div>

          <div><label className={lbl}>Observacoes</label><textarea className={inp} rows={2} value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} placeholder="Observacoes gerais da manutencao..." /></div>
        </div>

        {/* Checklist */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
              <ClipboardList size={15} className="text-slate-500" /> Checklist
              {checklistTotal > 0 && <span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium", checklistDone === checklistTotal ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600")}>{checklistDone}/{checklistTotal}</span>}
            </h2>
            <button type="button" onClick={openImportModal} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium transition-colors">
              <Download size={13} /> Importar Template
            </button>
          </div>
          {checklistTotal > 0 && <div className="w-full bg-slate-100 rounded-full h-2 mb-3"><div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${(checklistDone / checklistTotal) * 100}%` }} /></div>}
          <div className="space-y-2 mb-3">
            {checklist.map(item => (
              <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                <input type="checkbox" checked={item.done} onChange={() => toggleChecklistItem(item.id)} className="w-4 h-4 rounded accent-blue-600" />
                <span className={clsx("text-sm flex-1", item.done && "line-through text-slate-400")}>{item.text}</span>
                <button onClick={() => removeChecklistItem(item.id)} className="text-slate-300 hover:text-red-500 transition-colors"><X size={14} /></button>
              </div>
            ))}
            {checklist.length === 0 && <p className="text-slate-400 text-sm py-2">Nenhuma tarefa adicionada.</p>}
          </div>
          <div className="flex gap-2">
            <input className={clsx(inp, "flex-1")} value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addChecklistItem(); }}} placeholder="Nova tarefa manual..." />
            <button type="button" onClick={addChecklistItem} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"><Plus size={15} /></button>
          </div>
        </div>

        {/* Materiais */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
          <h2 className="font-semibold text-slate-700 flex items-center gap-2 mb-3"><Package size={15} className="text-slate-500" /> Materiais Utilizados</h2>
          {materials.length > 0 && (
            <div className="mb-3 space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 px-2">
                <span className="col-span-6">Material / Peca</span><span className="col-span-2 text-center">Qtd</span><span className="col-span-3">Unidade</span><span className="col-span-1"></span>
              </div>
              {materials.map(mat => (
                <div key={mat.id} className="grid grid-cols-12 gap-2 items-center bg-slate-50 rounded-lg px-2 py-1.5">
                  <input className="col-span-6 border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" value={mat.name} onChange={e => updateMaterial(mat.id, "name", e.target.value)} />
                  <input type="number" className="col-span-2 border border-slate-200 rounded px-2 py-1 text-sm text-center focus:outline-none" value={mat.quantity} onChange={e => updateMaterial(mat.id, "quantity", e.target.value)} min="0" step="0.1" />
                  <select className="col-span-3 border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none" value={mat.unit} onChange={e => updateMaterial(mat.id, "unit", e.target.value)}>
                    {["un","kg","L","m","m²","cx","par","jogo"].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <button onClick={() => removeMaterial(mat.id)} className="col-span-1 flex justify-center text-slate-300 hover:text-red-500"><X size={14} /></button>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-12 gap-2 items-center">
            <input className="col-span-6 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={newMaterial.name} onChange={e => setNewMaterial({ ...newMaterial, name: e.target.value })} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addMaterial(); }}} placeholder="Nome do material ou peca..." />
            <input type="number" className="col-span-2 border border-slate-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" value={newMaterial.quantity} onChange={e => setNewMaterial({ ...newMaterial, quantity: e.target.value })} min="0" step="0.1" />
            <select className="col-span-3 border border-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={newMaterial.unit} onChange={e => setNewMaterial({ ...newMaterial, unit: e.target.value })}>
              {["un","kg","L","m","m²","cx","par","jogo"].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <button type="button" onClick={addMaterial} className="col-span-1 flex justify-center px-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"><Plus size={15} /></button>
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
          {(!order?.photos || order.photos.length === 0) ? <p className="text-slate-400 text-sm">Nenhuma foto adicionada.</p> : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(order?.photos || []).map((p: any) => (
                <div key={p.public_id} className="relative group">
                  <img src={p.url} alt="foto" className="w-full h-32 object-cover rounded-lg border border-slate-200" />
                  <button onClick={() => handlePhotoDelete(p.public_id)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button>
                  <p className="text-xs text-slate-400 mt-1">{new Date(p.uploaded_at).toLocaleDateString("pt-BR")}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={handlePrint} className="flex items-center gap-2 px-5 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-sm font-medium">
            <Printer size={15} /> Imprimir OS
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
            <Save size={15} />{saving ? "Salvando..." : "Salvar Alteracoes"}
          </button>
          {form.status !== "completed" && form.status !== "cancelled" && (
            <button onClick={handleComplete} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
              <CheckCircle size={15} />Concluir OS
            </button>
          )}
        </div>

        {showCompanyModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Building2 size={18} className="text-blue-600" /> Empresas Terceirizadas</h2>
                <button onClick={() => setShowCompanyModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4">
                {/* Lista de empresas cadastradas */}
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase mb-2">Selecionar empresa cadastrada</p>
                  {companies.length === 0 ? (
                    <p className="text-slate-400 text-sm py-2">Nenhuma empresa cadastrada ainda.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {companies.map(c => (
                        <button key={c.id} type="button"
                          onClick={() => { setForm((prev: any) => ({ ...prev, contractor_name: c.name })); setShowCompanyModal(false); }}
                          className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm text-slate-800">{c.name}</span>
                            {c.cnpj && <span className="text-xs text-slate-400">{c.cnpj}</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Cadastrar nova empresa */}
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-medium text-slate-500 uppercase mb-3">Cadastrar nova empresa</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Nome da empresa</label>
                      <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)} placeholder="Razao social ou nome fantasia" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">CNPJ (opcional)</label>
                      <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={newCompanyCnpj} onChange={e => setNewCompanyCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
                <button type="button" onClick={() => setShowCompanyModal(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
                <button type="button" onClick={handleCreateCompany} disabled={!newCompanyName.trim() || savingCompany}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
                  {savingCompany ? "Salvando..." : "Cadastrar e Selecionar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showImportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Download size={18} className="text-indigo-600" /> Importar Checklist</h2>
                <button onClick={() => setShowImportModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4">
                {loadingTemplates ? <p className="text-center text-slate-400 py-8">Carregando templates...</p> :
                  templates.length === 0 ? <p className="text-center text-slate-400 py-8">Nenhum checklist cadastrado.</p> : (
                    <>
                      <div>
                        <label className={lbl}>Selecione o template</label>
                        <div className="space-y-2">
                          {templates.map(t => (
                            <button key={t.id} type="button" onClick={() => setSelectedTemplate(t.id)}
                              className={clsx("w-full text-left p-3 rounded-xl border transition-all", selectedTemplate === t.id ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50")}>
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-sm text-slate-800">{t.name}</span>
                                <span className="text-xs text-slate-400">{t.items.length} tarefas</span>
                              </div>
                              {t.category && <span className="text-xs text-indigo-600">{t.category}</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                      {checklist.length > 0 && (
                        <div>
                          <label className={lbl}>Modo de importacao</label>
                          <div className="flex gap-3">
                            <button type="button" onClick={() => setImportMode("append")} className={clsx("flex-1 py-2 rounded-lg border text-sm transition-all", importMode === "append" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50")}>Adicionar ao existente</button>
                            <button type="button" onClick={() => setImportMode("replace")} className={clsx("flex-1 py-2 rounded-lg border text-sm transition-all", importMode === "replace" ? "border-red-400 bg-red-50 text-red-700" : "border-slate-200 text-slate-600 hover:bg-slate-50")}>Substituir tudo</button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
              </div>
              <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
                <button type="button" onClick={() => setShowImportModal(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
                <button type="button" onClick={handleImport} disabled={!selectedTemplate} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">Importar</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
