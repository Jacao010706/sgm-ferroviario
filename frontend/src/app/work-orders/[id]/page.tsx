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
  const periodicidade = order.maintenance_type === "preventive" ? (
    order.title?.toLowerCase().includes("mensal") ? "Mensal" :
    order.title?.toLowerCase().includes("semestral") ? "Semestral" :
    order.title?.toLowerCase().includes("anual") ? "Anual" :
    order.title?.toLowerCase().includes("bienal") ? "Bienal" : "Preventiva"
  ) : MAINTENANCE_LABEL[order.maintenance_type] || order.maintenance_type;

  return (
    <div id="print-area" style={{ display: "none" }}>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          body.printing-os #print-area { visibility: visible !important; display: block !important; position: absolute; left: 0; top: 0; width: 100%; background: white; z-index: 99999; }
          body.printing-os #print-area * { visibility: visible !important; }
          body.printing-apr #apr-print-area { visibility: visible !important; display: block !important; position: absolute; left: 0; top: 0; width: 100%; background: white; z-index: 99999; }
          body.printing-apr #apr-print-area * { visibility: visible !important; }
          @page { margin: 10mm; size: A4; }
        }
        #print-area {
          font-family: Arial, sans-serif;
          font-size: 10px;
          color: #000;
          background: white;
          padding: 0;
          line-height: 1.3;
        }
        .trensurb-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
        .trensurb-table td, .trensurb-table th {
          border: 1px solid #000;
          padding: 3px 5px;
          font-size: 9px;
          vertical-align: top;
        }
        .trensurb-table th {
          background: #d9d9d9;
          font-weight: bold;
          text-align: center;
          font-size: 9px;
        }
        .header-empresa {
          text-align: center;
          font-weight: bold;
          font-size: 12px;
          border: 1px solid #000;
          padding: 4px;
          margin-bottom: 0;
        }
        .header-senerg {
          font-weight: bold;
          font-size: 10px;
          border: 1px solid #000;
          border-top: none;
          padding: 3px 5px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .section-title {
          background: #d9d9d9;
          font-weight: bold;
          font-size: 9px;
          border: 1px solid #000;
          padding: 2px 5px;
          text-transform: uppercase;
        }
        .field-line {
          border-bottom: 1px solid #000;
          min-height: 16px;
          display: inline-block;
          width: 100%;
        }
        .sign-box {
          border-top: 1px solid #000;
          text-align: center;
          padding-top: 3px;
          font-size: 9px;
        }
        .obs-box {
          border: 1px solid #000;
          min-height: 80px;
          padding: 4px;
          font-size: 9px;
        }
        .checklist-print-item {
          display: flex;
          align-items: flex-start;
          gap: 4px;
          padding: 2px 0;
          border-bottom: 1px solid #eee;
          font-size: 9px;
        }
        .check-box-print {
          width: 10px;
          height: 10px;
          border: 1px solid #000;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 8px;
          margin-top: 1px;
        }
        .no-print { display: block; }
        
      `}</style>

      {/* Botoes - nao imprimem */}
      <div className="no-print" style={{marginBottom: 12, display: "flex", gap: 8}}>
        <button onClick={() => { const el = document.getElementById("print-area"); if(el){el.style.display="block"; setTimeout(()=>{window.print(); el.style.display="none";},100);}}} style={{padding: "6px 16px", background: "#1E3A5F", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13}}>Imprimir</button>
        <button onClick={() => { const el = document.getElementById("print-area"); if(el) el.style.display="none"; }} style={{padding: "6px 16px", background: "#fff", border: "1px solid #ccc", borderRadius: 6, cursor: "pointer", fontSize: 13}}>Fechar</button>
      </div>

      {/* CABECALHO */}
      <div className="header-empresa">EMPRESA DE TRENS URBANOS DE PORTO ALEGRE S.A</div>
      <div className="header-senerg">
        <span>SENERG — ENERGIA</span>
        <span style={{fontSize: 11}}>OS Nº: <strong>{order.number}</strong></span>
      </div>

      {/* INFO PRINCIPAL */}
      <table className="trensurb-table" style={{marginTop: 0}}>
        <tbody>
          <tr>
            <td style={{width:"16%"}}><strong>OS ROMARCK Nº:</strong><br/>{order.number}</td>
            <td style={{width:"18%"}}><strong>LOCAL:</strong><br/>Sala do GGD</td>
            <td style={{width:"10%"}}><strong>SEMANA:</strong><br/>&nbsp;</td>
            <td style={{width:"10%"}}><strong>TURNO:</strong><br/>{form.actual_start ? (new Date(form.actual_start).getHours() < 12 ? "MANHÃ" : new Date(form.actual_start).getHours() < 18 ? "TARDE" : "NOITE") : ""}</td>
            <td style={{width:"46%"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}><tbody>
                <tr>
                  <td style={{width:"75%",border:"none",padding:"1px 0"}}><strong>Fiscal Trensurb (1):</strong></td>
                  <td style={{width:"25%",border:"none",padding:"1px 0"}}><strong>RE:</strong></td>
                </tr>
                <tr>
                  <td style={{border:"none",padding:"1px 0"}}><strong>Fiscal Trensurb (2):</strong></td>
                  <td style={{border:"none",padding:"1px 0"}}><strong>RE:</strong></td>
                </tr>
              </tbody></table>
            </td>
          </tr>
          <tr>
            <td colSpan={2}><strong>DATA DA EXECUÇÃO:</strong> {form.actual_start ? new Date(form.actual_start).toLocaleDateString("pt-BR") : ""}</td>
            <td colSpan={3}><strong>EMPRESA CONTRATADA:</strong> {form.contractor_name || ""}</td>
          </tr>
        </tbody>
      </table>

      {/* TABELA DE SERVICOS */}
      <table className="trensurb-table">
        <thead>
          <tr>
            <th style={{width:"35%"}}>Descrição</th>
            <th style={{width:"14%"}}>Periodicidade</th>
            <th style={{width:"21%"}}>Equipamento</th>
            <th style={{width:"10%"}}>Horário inicial</th>
            <th style={{width:"10%"}}>Horário final</th>
            <th style={{width:"5%"}}>Serviço concluído?</th>
            <th style={{width:"5%"}}>GGD em modo automático?</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{order.title}</td>
            <td style={{textAlign:"center"}}>{periodicidade}</td>
            <td>{asset ? `${asset.name} (${asset.tag})` : ""}{subAsset ? ` › ${subAsset.name}` : ""}</td>
            <td style={{textAlign:"center"}}>{form.actual_start ? new Date(form.actual_start).toLocaleTimeString("pt-BR", {hour:"2-digit",minute:"2-digit"}) : ""}</td>
            <td style={{textAlign:"center"}}>{form.actual_end ? new Date(form.actual_end).toLocaleTimeString("pt-BR", {hour:"2-digit",minute:"2-digit"}) : ""}</td>
            <td style={{textAlign:"center"}}>{form.status === "completed" ? "Sim" : ""}</td>
            <td style={{textAlign:"center"}}>&nbsp;</td>
          </tr>
        </tbody>
      </table>

      {/* ATIVIDADES / OBSERVACOES */}
      <table className="trensurb-table">
        <tbody>
          <tr>
            <td colSpan={2} className="section-title">Descrição das atividades, relação de materiais, apontamento de observações e inconformidades:</td>
          </tr>
          <tr>
            <td style={{width:"50%", verticalAlign:"top"}}>
              <strong>MANHÃ:</strong>
              <div style={{paddingTop: 4}}>{form.observations || ""}</div>
            </td>
            <td style={{width:"50%", verticalAlign:"top"}}>
              <strong>TARDE:</strong>
              <div style={{minHeight: 160}}>&nbsp;</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* CHECKLIST */}
      {checklist.length > 0 && (
        <table className="trensurb-table">
          <thead>
            <tr>
              <th colSpan={4}>CHECKLIST DE ATIVIDADES ({checklistDone}/{checklist.length} concluídos)</th>
            </tr>
            <tr>
              <th style={{width:"4%"}}>✓</th>
              <th style={{width:"46%"}}>Atividade</th>
              <th style={{width:"4%"}}>✓</th>
              <th style={{width:"46%"}}>Atividade</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({length: Math.ceil(checklist.length / 2)}, (_, i) => (
              <tr key={i}>
                <td style={{textAlign:"center"}}>{checklist[i*2]?.done ? "✓" : "☐"}</td>
                <td style={{textDecoration: checklist[i*2]?.done ? "line-through" : "none", color: checklist[i*2]?.done ? "#666" : "#000"}}>{checklist[i*2]?.text}</td>
                <td style={{textAlign:"center"}}>{checklist[i*2+1] ? (checklist[i*2+1]?.done ? "✓" : "☐") : ""}</td>
                <td style={{textDecoration: checklist[i*2+1]?.done ? "line-through" : "none", color: checklist[i*2+1]?.done ? "#666" : "#000"}}>{checklist[i*2+1]?.text || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* MATERIAIS */}
      {materials.length > 0 && (
        <table className="trensurb-table">
          <thead>
            <tr><th colSpan={4}>MATERIAIS UTILIZADOS</th></tr>
            <tr>
              <th style={{width:"5%"}}>#</th>
              <th style={{width:"55%"}}>Material / Peça</th>
              <th style={{width:"20%"}}>Quantidade</th>
              <th style={{width:"20%"}}>Unidade</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((mat: Material, i: number) => (
              <tr key={mat.id}>
                <td style={{textAlign:"center"}}>{i+1}</td>
                <td>{mat.name}</td>
                <td style={{textAlign:"center"}}>{mat.quantity}</td>
                <td style={{textAlign:"center"}}>{mat.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* CONDICOES DE SEGURANCA */}
      <table className="trensurb-table">
        <tbody>
          <tr><td className="section-title" colSpan={4}>CONDIÇÕES DE SEGURANÇA: REALIZAR A APR ANTES DO INÍCIO DAS ATIVIDADES</td></tr>
          <tr>
            <td style={{width:"25%"}}><strong>EMPREGADOS</strong></td>
            <td style={{width:"10%"}}><strong>RE</strong></td>
            <td style={{width:"25%"}}><strong>EMPREGADOS</strong></td>
            <td style={{width:"10%"}}><strong>RE</strong></td>
          </tr>
          <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
          <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
          <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
        </tbody>
      </table>

      {/* ASSINATURAS */}
      <table className="trensurb-table">
        <tbody>
          <tr>
            <td style={{width:"33%"}}>
              <strong>Programada por:</strong><br/>
              <div style={{minHeight:16}}>&nbsp;</div>
              <div style={{display:"flex", gap:8}}>
                <span>RE:</span>
                <span>Assinatura:</span>
              </div>
            </td>
            <td style={{width:"34%"}}>
              <strong>Preposto da CONTRATADA {form.contractor_name || ""}:</strong><br/>
              <div style={{minHeight:16}}>{form.contractor_preposto || ""}</div>
            </td>
            <td style={{width:"33%"}}>
              <strong>Fiscal Trensurb (M):</strong><br/>
              <div style={{minHeight:16}}>&nbsp;</div>
              <strong>Fiscal Trensurb (T):</strong><br/>
              <div style={{minHeight:16}}>&nbsp;</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* OBSERVACOES GESTAO */}
      <table className="trensurb-table">
        <tbody>
          <tr><td className="section-title">OBSERVAÇÕES DA GESTÃO / SUPERVISÃO</td></tr>
          <tr><td style={{height:20}}>{form.observations || ""}&nbsp;</td></tr>
        </tbody>
      </table>

      {/* RESPONSAVEL */}
      <table className="trensurb-table">
        <thead>
          <tr><th colSpan={4}>RESPONSÁVEL PELAS OBSERVAÇÕES</th></tr>
          <tr>
            <th style={{width:"40%"}}>Nome</th>
            <th style={{width:"15%"}}>RE</th>
            <th style={{width:"20%"}}>Data</th>
            <th style={{width:"25%"}}>Assinatura</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{height:24}}>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
          </tr>
        </tbody>
      </table>

      <div style={{textAlign:"right", fontSize:8, color:"#666", marginTop:4}}>
        SGM Ferroviario — Emitido em: {now} | OS: {order.number}
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
  const [partSearch, setPartSearch] = useState("");
  const [partResults, setPartResults] = useState([]);
  const [showPartDropdown, setShowPartDropdown] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAPR, setShowAPR] = useState(false);
  const [printMode, setPrintMode] = useState<"os"|"apr"|null>(null);
  const [aprSelections, setAprSelections] = useState<Record<string, boolean>>({});
  const toggleAPR = (key: string) => setAprSelections(prev => ({ ...prev, [key]: !prev[key] }));
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
    const os = document.getElementById("print-area");
    const apr = document.getElementById("apr-print-area");
    if (!os) return;
    document.body.classList.add("printing-os");
    os.style.display = "block";
    if (apr) apr.style.display = "none";
    window.print();
    os.style.display = "none";
    document.body.classList.remove("printing-os");
  };

  const handlePrintAPR = () => {
    const os = document.getElementById("print-area");
    const apr = document.getElementById("apr-print-area");
    if (!apr) return;
    document.body.classList.add("printing-apr");
    apr.style.display = "block";
    if (os) os.style.display = "none";
    window.print();
    apr.style.display = "none";
    document.body.classList.remove("printing-apr");
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
  const searchParts = async (term: string) => { setPartSearch(term); setNewMaterial({ ...newMaterial, name: term }); if (term.length < 2) { setPartResults([]); setShowPartDropdown(false); return; } try { const r = await api.get("/parts/", { params: { search: term, limit: 8 } }); setPartResults(r.data); setShowPartDropdown(r.data.length > 0); } catch { setPartResults([]); setShowPartDropdown(false); } };
  const selectPart = (part: any) => { setNewMaterial({ name: part.name, quantity: "1", unit: part.unit || "un" }); setPartSearch(part.name); setShowPartDropdown(false); setPartResults([]); };
  const addMaterial = () => { if (!newMaterial.name.trim()) return; setMaterials([...materials, { id: Date.now().toString(), ...newMaterial }]); setNewMaterial({ name: "", quantity: "1", unit: "un" }); setPartSearch(""); setShowPartDropdown(false); };
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
            <button onClick={() => setShowAPR(true)} className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors">
              <Printer size={15} /> Imprimir APR
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
          <div className="grid grid-cols-12 gap-2 items-center relative">
            <div className="col-span-6 relative">
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={partSearch} onChange={e => searchParts(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addMaterial(); }}} placeholder="Buscar peca do almoxarifado..." autoComplete="off" />
              {showPartDropdown && partResults.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                  {partResults.map((p: any) => (
                    <button key={p.id} type="button" onClick={() => selectPart(p)} className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-slate-50 last:border-0">
                      <span className="font-medium text-slate-800">{p.name}</span>
                      <span className="text-xs text-slate-400 ml-2">{p.code}</span>
                      <span className="text-xs text-blue-600 ml-2">{p.unit}</span>
                      {p.quantity_stock != null && <span className="text-xs text-green-600 ml-2">Estoque: {p.quantity_stock}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
          <button onClick={() => setShowAPR(true)} className="flex items-center gap-2 px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium">
            <Printer size={15} /> Imprimir APR
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

        {showAPR && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-800">APR / Check-List de Seguranca</h2>
                <div className="flex gap-2">
                  <button onClick={handlePrintAPR} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium">
                    <Printer size={14} /> Imprimir APR
                  </button>
                  <button onClick={() => setShowAPR(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-slate-700 text-sm mb-2">Equipamentos de Seguranca / EPIs</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {["Capacete de seguranca","Protetor facial verde","Oculos de protecao","Protetor auditivo","Respirador","Perneira","Tapete isolante","Vara de manobra","Detector de tensao","Aterramento temporario","Fitas/cones","Radio comunicador"].map(epi => (
                      <label key={epi} className={clsx("flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm transition-all", aprSelections[`epi_${epi}`] ? "border-orange-400 bg-orange-50 text-orange-800 font-medium" : "border-slate-200 hover:border-slate-300 text-slate-600")}>
                        <input type="checkbox" checked={!!aprSelections[`epi_${epi}`]} onChange={() => toggleAPR(`epi_${epi}`)} className="accent-orange-500" />
                        {epi}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-700 text-sm mb-2">Riscos Identificados</h3>
                  <div className="space-y-3">
                    {[
                      {key:"eletrico", titulo:"Riscos Eletricos", itens:["Contato com partes energizadas","Arco eletrico / flash eletrico","Inducao eletromagnetica","Eletricidade estatica"]},
                      {key:"queda", titulo:"Riscos de Queda", itens:["Queda de mesmo nivel","Queda de nivel diferente","Queda de objetos/ferramentas"]},
                      {key:"incendio", titulo:"Riscos de Incendio/Explosao", itens:["Presenca de gases inflamaveis","Curto circuito / faiscas","Materiais combustiveis no local"]},
                      {key:"mecanico", titulo:"Riscos Mecanicos", itens:["Contato com partes moveis de maquinas","Ferramentas inadequadas ou defeituosas","Projecao de particulas/fragmentos"]},
                      {key:"ergonomico", titulo:"Riscos Ergonomicos", itens:["Postura inadequada em estruturas","Trabalhos agaixados em paineis","Levantamento e transporte manual de cargas (23kg)"]},
                      {key:"terceiros", titulo:"Riscos a Terceiros", itens:["Energizacao acidental","Colisao de veiculos"]},
                    ].map((section: any) => (
                      <div key={section.key} className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="bg-slate-50 px-3 py-2 font-medium text-sm text-slate-700">{section.titulo}</div>
                        <div className="p-2 grid grid-cols-2 gap-1">
                          {section.itens.map((item: string) => (
                            <label key={item} className={clsx("flex items-center gap-2 p-1.5 rounded cursor-pointer text-xs transition-all", aprSelections[`risco_${item}`] ? "bg-red-50 text-red-700 font-medium" : "hover:bg-slate-50 text-slate-600")}>
                              <input type="checkbox" checked={!!aprSelections[`risco_${item}`]} onChange={() => toggleAPR(`risco_${item}`)} className="accent-red-500" />
                              {item}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div id="apr-print-area" style={{display: "none"}}>
                <style>{``}</style>
                <table style={{width:"100%",borderCollapse:"collapse",marginBottom:"4px",fontFamily:"Arial,sans-serif",fontSize:"10px"}}>
                  <tbody>
                    <tr><td style={{border:"1px solid black",padding:"4px",textAlign:"center",fontWeight:"bold",fontSize:"11px"}} colSpan={3}>SENERG - Setor de Energia<br/><span style={{fontSize:"10px",fontWeight:"normal"}}>Check-List de Seguranca do Trabalho - Manutencao dos Sistemas de Abastecimento de Energia Eletrica</span></td></tr>
                    <tr>
                      <td style={{border:"1px solid black",padding:"4px",fontSize:"10px",width:"40%"}}><strong>Numero (OS/PI):</strong> {order.number}</td>
                      <td style={{border:"1px solid black",padding:"4px",fontSize:"10px",width:"35%"}}><strong>Data:</strong> {form.actual_start ? new Date(form.actual_start).toLocaleDateString("pt-BR") : new Date().toLocaleDateString("pt-BR")}</td>
                      <td style={{border:"1px solid black",padding:"4px",fontSize:"10px",width:"25%"}}><strong>Turno:</strong> {form.actual_start ? (new Date(form.actual_start).getHours() < 12 ? "Manha" : new Date(form.actual_start).getHours() < 18 ? "Tarde" : "Noite") : ""}</td>
                    </tr>
                    <tr>
                      <td style={{border:"1px solid black",padding:"4px",fontSize:"10px"}} colSpan={2}><strong>Supervisor do CCO:</strong></td>
                      <td style={{border:"1px solid black",padding:"4px",fontSize:"10px"}}><strong>Ha outras equipes?</strong> ☐ Sim &nbsp; ☐ Nao</td>
                    </tr>
                    <tr>
                      <td style={{border:"1px solid black",padding:"4px",fontSize:"10px"}} colSpan={3}><strong>Empresa Contratada:</strong> {form.contractor_name || ""} {form.contractor_preposto ? `— Preposto: ${form.contractor_preposto}` : ""}</td>
                    </tr>
                  </tbody>
                </table>

                <table style={{width:"100%",borderCollapse:"collapse",marginBottom:"4px",fontFamily:"Arial,sans-serif",fontSize:"10px"}}>
                  <tbody>
                    <tr><td style={{border:"1px solid black",padding:"3px",background:"#d9d9d9",fontWeight:"bold"}}>Descricao dos servicos a serem executados</td></tr>
                    <tr><td style={{border:"1px solid black",padding:"4px",height:"40px"}}>{order.title}{asset ? ` — ${asset.name} (${asset.tag})` : ""}</td></tr>
                  </tbody>
                </table>

                {Object.entries(aprSelections).some(([k,v]) => k.startsWith("epi_") && v) && (
                  <table style={{width:"100%",borderCollapse:"collapse",marginBottom:"4px",fontFamily:"Arial,sans-serif",fontSize:"10px"}}>
                    <tbody>
                      <tr><td colSpan={4} style={{border:"1px solid black",padding:"3px",background:"#d9d9d9",fontWeight:"bold"}}>Equipamentos de seguranca a serem utilizados</td></tr>
                      {(() => {
                        const sel = Object.entries(aprSelections).filter(([k,v]) => k.startsWith("epi_") && v).map(([k]) => k.replace("epi_",""));
                        const rows: any[] = [];
                        for(let i=0;i<sel.length;i+=2){
                          rows.push(<tr key={i}><td style={{border:"1px solid black",padding:"3px",width:"5%",textAlign:"center"}}>☑</td><td style={{border:"1px solid black",padding:"3px",width:"45%"}}>{sel[i]}</td><td style={{border:"1px solid black",padding:"3px",width:"5%",textAlign:"center"}}>{sel[i+1]?"☑":""}</td><td style={{border:"1px solid black",padding:"3px",width:"45%"}}>{sel[i+1]||""}</td></tr>);
                        }
                        return rows;
                      })()}
                    </tbody>
                  </table>
                )}

                {Object.entries(aprSelections).some(([k,v]) => k.startsWith("risco_") && v) && (
                  <table style={{width:"100%",borderCollapse:"collapse",marginBottom:"4px",fontFamily:"Arial,sans-serif",fontSize:"10px"}}>
                    <tbody>
                      <tr><td colSpan={2} style={{border:"1px solid black",padding:"3px",background:"#d9d9d9",fontWeight:"bold"}}>Riscos Identificados</td></tr>
                      {Object.entries(aprSelections).filter(([k,v]) => k.startsWith("risco_") && v).map(([k]) => (
                        <tr key={k}><td style={{border:"1px solid black",padding:"3px",width:"5%",textAlign:"center"}}>☑</td><td style={{border:"1px solid black",padding:"3px"}}>{k.replace("risco_","")}</td></tr>
                      ))}
                    </tbody>
                  </table>
                )}

                <table style={{width:"100%",borderCollapse:"collapse",marginBottom:"4px",fontFamily:"Arial,sans-serif",fontSize:"10px"}}>
                  <tbody>
                    <tr><td colSpan={2} style={{border:"1px solid black",padding:"3px",background:"#d9d9d9",fontWeight:"bold"}}>Planejamento</td></tr>
                    {[["a)","A equipe conferiu o servico a ser executado e esta apta a realizar as tarefas?"],["b)","Todos estao cientes do procedimento de trabalho para a atividade?"],["c)","O CCO foi informado da presenca da equipe na instalacao?"]].map((row,i) => (
                      <tr key={i}><td style={{border:"1px solid black",padding:"3px",width:"85%"}}><strong>{row[0]}</strong> {row[1]}</td><td style={{border:"1px solid black",padding:"3px",width:"15%",textAlign:"center"}}>☐ Sim &nbsp; ☐ Nao</td></tr>
                    ))}
                  </tbody>
                </table>

                <table style={{width:"100%",borderCollapse:"collapse",marginBottom:"4px",fontFamily:"Arial,sans-serif",fontSize:"10px"}}>
                  <tbody>
                    <tr><td colSpan={2} style={{border:"1px solid black",padding:"3px",background:"#d9d9d9",fontWeight:"bold"}}>Outros requisitos</td></tr>
                    {["Todo pessoal envolvido na atividade esta sem adornos (relogio, cracha, anel/alianca, etc.) ?","A equipe conferiu o servico a ser executado ? (Revisar)","A APR foi discutida e entendida por todos ?","Todos estao cientes que so deverao iniciar os servicos apos autorizacao ?"].map((item,i) => (
                      <tr key={i}><td style={{border:"1px solid black",padding:"3px",width:"85%"}}><strong>{i+1}</strong> {item}</td><td style={{border:"1px solid black",padding:"3px",width:"15%",textAlign:"center"}}>☐ Sim &nbsp; ☐ Nao</td></tr>
                    ))}
                  </tbody>
                </table>

                <table style={{width:"100%",borderCollapse:"collapse",marginBottom:"4px",fontFamily:"Arial,sans-serif",fontSize:"10px"}}>
                  <tbody>
                    <tr><td colSpan={2} style={{border:"1px solid black",padding:"3px",background:"#d9d9d9",fontWeight:"bold"}}>Termino da manutencao (ANTES DA OPERACAO DE REENERGIZACAO)</td></tr>
                    {["Foram retirados os aterramentos temporarios ?","Foram retirados os cartoes de seguranca e os bloqueios das seccionadoras/disjuntores ?","Foi retirado todo pessoal e ferramental da area a ser reenergizada ?","Foi preenchido o Livro de Registros de Acesso (SEs e CBs) ?"].map((item,i) => (
                      <tr key={i}><td style={{border:"1px solid black",padding:"3px",width:"85%"}}><strong>{i+1}</strong> {item}</td><td style={{border:"1px solid black",padding:"3px",width:"15%",textAlign:"center"}}>☐ Sim &nbsp; ☐ Nao</td></tr>
                    ))}
                  </tbody>
                </table>

                <table style={{width:"100%",borderCollapse:"collapse",marginBottom:"4px",fontFamily:"Arial,sans-serif",fontSize:"10px"}}>
                  <tbody>
                    <tr><td colSpan={3} style={{border:"1px solid black",padding:"3px",background:"#d9d9d9",fontWeight:"bold"}}>Pessoal autorizado e ciente desta Permissao de Trabalho</td></tr>
                    <tr><th style={{border:"1px solid black",padding:"3px",width:"50%",textAlign:"left"}}>Nome</th><th style={{border:"1px solid black",padding:"3px",width:"15%"}}>RE</th><th style={{border:"1px solid black",padding:"3px",width:"35%"}}>Visto</th></tr>
                    {[0,1,2,3].map(i => (<tr key={i} style={{height:"20px"}}><td style={{border:"1px solid black",padding:"3px"}}>&nbsp;</td><td style={{border:"1px solid black",padding:"3px"}}>&nbsp;</td><td style={{border:"1px solid black",padding:"3px"}}>&nbsp;</td></tr>))}
                  </tbody>
                </table>

                <table style={{width:"100%",borderCollapse:"collapse",marginBottom:"4px",fontFamily:"Arial,sans-serif",fontSize:"10px"}}>
                  <tbody>
                    <tr>
                      <td style={{border:"1px solid black",padding:"4px",width:"50%"}}><strong>Visto do Responsavel pela atividade:</strong><div style={{minHeight:"24px"}}>&nbsp;</div></td>
                      <td style={{border:"1px solid black",padding:"4px",width:"50%"}}><strong>Justificativa:</strong><div style={{minHeight:"24px"}}>&nbsp;</div></td>
                    </tr>
                  </tbody>
                </table>

                <table style={{width:"100%",borderCollapse:"collapse",fontFamily:"Arial,sans-serif"}}>
                  <tbody>
                    <tr><td style={{border:"1px solid black",padding:"4px",fontSize:"9px"}}><strong>Direito de Recusa:</strong> "O trabalhador podera interromper suas atividades quando constatar uma situacao de trabalho onde, a seu ver, envolva um risco grave e iminente para a sua vida e saude, informando imediatamente ao seu superior hierarquico." (Item 1.4.3 - Portaria no 915 de 30 de julho de 2019 - SEPRT)</td></tr>
                  </tbody>
                </table>
                <div style={{textAlign:"right",fontSize:"8px",color:"#666",marginTop:"4px",fontFamily:"Arial,sans-serif"}}>SGM Ferroviario — APR/PT — OS: {order.number} — Emitido em: {new Date().toLocaleDateString("pt-BR")}</div>
              </div>
            </div>
          </div>
        )}

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
