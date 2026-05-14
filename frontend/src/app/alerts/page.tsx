"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import { AlertTriangle, RefreshCw, CheckCircle, Wrench } from "lucide-react";
import clsx from "clsx";
const SEVERITY_BADGE: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-green-100 text-green-700 border-green-200",
};
const STATUS_LABEL: Record<string, string> = {
  active: "Ativo", acknowledged: "Reconhecido",
  in_treatment: "Em Tratamento", resolved: "Resolvido",
};
export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("active");
  const load = () => {
    setLoading(true);
    api.get("/alerts", { params: { status: statusFilter || undefined, limit: 100 } }).then((r) => setAlerts(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [statusFilter]);
  const acknowledge = async (id: string) => { await api.post(`/alerts/${id}/acknowledge`); load(); };
  const resolve = async (id: string) => { await api.post(`/alerts/${id}/resolve`); load(); };
  const createWO = async (id: string) => { await api.post(`/alerts/${id}/create-work-order`); load(); };
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="text-2xl font-bold text-slate-800">Alertas</h1><p className="text-slate-500 text-sm">{alerts.length} registros</p></div>
          <button onClick={load} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 bg-white"><RefreshCw size={15} className="text-slate-500" /></button>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="space-y-3">
          {loading ? <p className="text-center text-slate-400 py-10">Carregando...</p>
          : alerts.length === 0 ? <p className="text-center text-slate-400 py-10">Nenhum alerta encontrado</p>
          : alerts.map((a) => (
            <div key={a.id} className={clsx("bg-white rounded-xl border p-4 flex gap-4 items-start shadow-sm", SEVERITY_BADGE[a.severity])}>
              <AlertTriangle size={20} className="mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{a.title}</span>
                  <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium border", SEVERITY_BADGE[a.severity])}>{a.severity}</span>
                  <span className="text-xs text-slate-500">{STATUS_LABEL[a.status] || a.status}</span>
                </div>
                {a.description && <p className="text-xs opacity-80 mb-1">{a.description}</p>}
                <p className="text-xs opacity-60">{new Date(a.triggered_at).toLocaleString("pt-BR")} - {a.source}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {a.status === "active" && (<>
                  <button onClick={() => acknowledge(a.id)} className="flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"><CheckCircle size={12} /> Reconhecer</button>
                  <button onClick={() => createWO(a.id)} className="flex items-center gap-1 text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600"><Wrench size={12} /> Abrir OS</button>
                </>)}
                {a.status === "acknowledged" && (
                  <button onClick={() => resolve(a.id)} className="flex items-center gap-1 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700"><CheckCircle size={12} /> Resolver</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}