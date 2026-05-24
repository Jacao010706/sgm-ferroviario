"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import { FileText, RefreshCw, Printer, ChevronDown, ChevronUp, CheckCircle, Clock, AlertTriangle, XCircle } from "lucide-react";
import clsx from "clsx";

const STATUS_LABEL: Record<string, string> = { pending: "Pendente", assigned: "Atribuida", in_progress: "Em Execucao", paused: "Pausada", waiting_parts: "Ag. Pecas", completed: "Concluida", cancelled: "Cancelada", waiting_approval: "Ag. Aprovacao" };
const MAINTENANCE_LABEL: Record<string, string> = { preventive: "Preventiva", corrective: "Corretiva", emergency: "Emergencial", predictive: "Preditiva", inspection: "Inspecao", calibration: "Calibracao" };

const TURNO_OPTIONS = ["MANHA", "TARDE", "NOITE", "DIA"];

export default function DailyReportPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [turno, setTurno] = useState("DIA");
  const [equipe, setEquipe] = useState("");
  const [supervisor, setSupervisor] = useState("Leonardo Costa Santos");
  const [re, setRe] = useState("2885");
  const [obs, setObs] = useState("");
  const [pendencias, setPendencias] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get("/work-orders/", { params: { limit: 200 } }).then(r => setOrders(r.data)),
      api.get("/assets/", { params: { limit: 200 } }).then(r => setAssets(r.data)),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const dateOrders = orders.filter(o => {
    const d = o.actual_start || o.scheduled_start;
    return d && d.startsWith(date);
  });

  const completed = dateOrders.filter(o => o.status === "completed");
  const inProgress = dateOrders.filter(o => o.status === "in_progress");
  const pending = dateOrders.filter(o => ["pending","assigned","waiting_parts","waiting_approval"].includes(o.status));

  const assetName = (id: string) => assets.find(a => a.id === id)?.name || id?.slice(0, 8) || "-";

  const toggleExpand = (id: string) => {
    const s = new Set(expanded);
    s.has(id) ? s.delete(id) : s.add(id);
    setExpanded(s);
  };

  const handlePrint = () => window.print();

  const inp = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const lbl = "block text-sm font-medium text-slate-700 mb-1";

  const OSCard = ({ o }: { o: any }) => {
    const isOpen = expanded.has(o.id);
    const statusColor = o.status === "completed" ? "border-green-200 bg-green-50" : o.status === "in_progress" ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white";
    return (
      <div className={"border rounded-lg mb-2 " + statusColor}>
        <div className="flex items-center gap-3 px-4 py-2.5 cursor-pointer" onClick={() => toggleExpand(o.id)}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-blue-700 text-sm">{o.number}</span>
              <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", o.status === "completed" ? "bg-green-100 text-green-700" : o.status === "in_progress" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600")}>{STATUS_LABEL[o.status] || o.status}</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{MAINTENANCE_LABEL[o.maintenance_type] || o.maintenance_type}</span>
            </div>
            <p className="text-sm font-medium text-slate-800 truncate mt-0.5">{o.title}</p>
            <p className="text-xs text-slate-500">{assetName(o.asset_id)}</p>
          </div>
          <div className="text-right shrink-0 text-xs text-slate-500">
            {o.actual_start && <p>Início: {new Date(o.actual_start).toLocaleTimeString("pt-BR", {hour:"2-digit",minute:"2-digit"})}</p>}
            {o.actual_end && <p>Fim: {new Date(o.actual_end).toLocaleTimeString("pt-BR", {hour:"2-digit",minute:"2-digit"})}</p>}
            {o.actual_duration_h && <p className="font-semibold text-slate-700">{o.actual_duration_h}h</p>}
          </div>
          {isOpen ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
        </div>
        {isOpen && (
          <div className="border-t border-slate-200 px-4 py-3 space-y-2 bg-white rounded-b-lg">
            {o.description && <p className="text-xs text-slate-600"><span className="font-medium">Descricao:</span> {o.description}</p>}
            {o.observations && <p className="text-xs text-slate-600"><span className="font-medium">Observacoes:</span> {o.observations}</p>}
            {o.root_cause && <p className="text-xs text-slate-600"><span className="font-medium">Causa Raiz:</span> {o.root_cause}</p>}
            {o.corrective_action && <p className="text-xs text-slate-600"><span className="font-medium">Acao Corretiva:</span> {o.corrective_action}</p>}
            {o.parts_used?.length > 0 && <p className="text-xs text-slate-600"><span className="font-medium">Pecas Usadas:</span> {o.parts_used.join(", ")}</p>}
            {o.contractor_name && <p className="text-xs text-slate-600"><span className="font-medium">Terceirizada:</span> {o.contractor_name}</p>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6 no-print">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Relatorio Diario da Equipe</h1>
            <p className="text-slate-500 text-sm">Resumo das atividades do turno — conforme Fluxo SAEE</p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 bg-white"><RefreshCw size={15} className="text-slate-500" /></button>
            <button onClick={handlePrint} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"><Printer size={15} /> Imprimir / PDF</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6 no-print">
          <div>
            <label className={lbl}>Data do Relatório</label>
            <input type="date" className={inp} value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Turno</label>
            <select className={inp} value={turno} onChange={e => setTurno(e.target.value)}>
              {TURNO_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Equipe / Técnicos</label>
            <input className={inp} value={equipe} onChange={e => setEquipe(e.target.value)} placeholder="Nomes dos técnicos do turno" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-green-200 p-4 flex gap-3 items-center">
            <div className="p-2 bg-green-50 rounded-lg"><CheckCircle size={18} className="text-green-600" /></div>
            <div><p className="text-2xl font-bold text-slate-800">{completed.length}</p><p className="text-xs text-slate-500">OS Concluidas</p></div>
          </div>
          <div className="bg-white rounded-xl border border-blue-200 p-4 flex gap-3 items-center">
            <div className="p-2 bg-blue-50 rounded-lg"><Clock size={18} className="text-blue-600" /></div>
            <div><p className="text-2xl font-bold text-slate-800">{inProgress.length}</p><p className="text-xs text-slate-500">Em Execucao</p></div>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 p-4 flex gap-3 items-center">
            <div className="p-2 bg-amber-50 rounded-lg"><AlertTriangle size={18} className="text-amber-600" /></div>
            <div><p className="text-2xl font-bold text-slate-800">{pending.length}</p><p className="text-xs text-slate-500">Pendentes</p></div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-slate-800 text-base">TRENSURB / SENERG ENERGIA</h2>
            <span className="text-xs text-slate-500">RELATÓRIO DIÁRIO DA EQUIPE</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm border-t border-slate-100 pt-3 mb-4">
            <div><span className="text-slate-500 text-xs">Data:</span><p className="font-medium">{new Date(date + "T12:00:00").toLocaleDateString("pt-BR")}</p></div>
            <div><span className="text-slate-500 text-xs">Turno:</span><p className="font-medium">{turno}</p></div>
            <div><span className="text-slate-500 text-xs">Equipe:</span><p className="font-medium">{equipe || "—"}</p></div>
          </div>

          {completed.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-bold text-green-700 mb-2 flex items-center gap-2"><CheckCircle size={14} /> OS CONCLUIDAS ({completed.length})</h3>
              {completed.map(o => <OSCard key={o.id} o={o} />)}
            </div>
          )}

          {inProgress.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-bold text-blue-700 mb-2 flex items-center gap-2"><Clock size={14} /> EM EXECUCAO ({inProgress.length})</h3>
              {inProgress.map(o => <OSCard key={o.id} o={o} />)}
            </div>
          )}

          {pending.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-bold text-amber-700 mb-2 flex items-center gap-2"><AlertTriangle size={14} /> PENDENTES / TRANSFERIDAS ({pending.length})</h3>
              {pending.map(o => <OSCard key={o.id} o={o} />)}
            </div>
          )}

          {dateOrders.length === 0 && !loading && (
            <div className="text-center py-8 text-slate-400">
              <FileText size={32} className="mx-auto mb-2 text-slate-300" />
              <p>Nenhuma OS encontrada para esta data.</p>
            </div>
          )}

          <div className="border-t border-slate-200 pt-4 mt-4 space-y-3">
            <div>
              <label className={lbl}>Descricao das Atividades / Observacoes Gerais</label>
              <textarea className={inp + " print-field"} rows={4} value={obs} onChange={e => setObs(e.target.value)} placeholder="Descreva as principais atividades realizadas no turno, materiais utilizados e inconformidades..." />
            </div>
            <div>
              <label className={lbl}>Pendencias para o Proximo Turno</label>
              <textarea className={inp + " print-field"} rows={3} value={pendencias} onChange={e => setPendencias(e.target.value)} placeholder="Liste as pendencias que devem ser tratadas pelo proximo turno..." />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 mt-4">
            <p className="text-xs font-bold text-slate-700 mb-3">ASSINATURAS</p>
            <div className="grid grid-cols-3 gap-6">
              <div className="no-print">
                <label className={lbl}>Supervisor Responsavel</label>
                <input className={inp} value={supervisor} onChange={e => setSupervisor(e.target.value)} />
              </div>
              <div className="no-print">
                <label className={lbl}>RE</label>
                <input className={inp} value={re} onChange={e => setRe(e.target.value)} />
              </div>
              <div className="no-print">
                <label className={lbl}>Contato CCO</label>
                <input className={inp} placeholder="Ramal / telefone" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-6 mt-4 print-signatures">
              <div className="border-t border-slate-400 pt-2 text-xs text-slate-600 text-center"><p className="font-medium">{supervisor}</p><p>RE: {re}</p><p className="text-slate-400">Supervisor Responsavel</p></div>
              <div className="border-t border-slate-400 pt-2 text-xs text-slate-600 text-center"><p className="h-4"></p><p className="text-slate-400 mt-1">Tecnico Responsavel</p></div>
              <div className="border-t border-slate-400 pt-2 text-xs text-slate-600 text-center"><p className="h-4"></p><p className="text-slate-400 mt-1">Fiscal Trensurb</p></div>
            </div>
          </div>
        </div>
      </main>

      <style jsx global>{
        @media print {
          .no-print { display: none !important; }
          .sidebar { display: none !important; }
          main { padding: 0 !important; }
          body { background: white !important; }
        }
      }</style>
    </div>
  );
}
