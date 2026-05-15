"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import { Plus, Filter, Search, RefreshCw } from "lucide-react";
import clsx from "clsx";

const PRIORITY_BADGE: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high:     "bg-orange-100 text-orange-700",
  medium:   "bg-amber-100 text-amber-700",
  low:      "bg-green-100 text-green-700",
};

const STATUS_BADGE: Record<string, string> = {
  pending:          "bg-slate-100 text-slate-600",
  assigned:         "bg-blue-100 text-blue-700",
  in_progress:      "bg-indigo-100 text-indigo-700",
  paused:           "bg-yellow-100 text-yellow-700",
  waiting_parts:    "bg-orange-100 text-orange-700",
  waiting_approval: "bg-purple-100 text-purple-700",
  completed:        "bg-green-100 text-green-700",
  cancelled:        "bg-slate-100 text-slate-400",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente", assigned: "Atribuída", in_progress: "Em Execução",
  paused: "Pausada", waiting_parts: "Ag. Peças", completed: "Concluída",
  cancelled: "Cancelada", waiting_approval: "Ag. Aprovação",
};

const MAINTENANCE_BADGE: Record<string, string> = {
  preventive:  "bg-blue-100 text-blue-700",
  corrective:  "bg-red-100 text-red-700",
  emergency:   "bg-rose-100 text-rose-800",
  predictive:  "bg-purple-100 text-purple-700",
  inspection:  "bg-teal-100 text-teal-700",
  calibration: "bg-gray-100 text-gray-700",
};

const MAINTENANCE_LABEL: Record<string, string> = {
  preventive:  "Preventiva",
  corrective:  "Corretiva",
  emergency:   "Emergencial",
  predictive:  "Preditiva",
  inspection:  "Inspeção",
  calibration: "Calibração",
};

export default function WorkOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const load = () => {
    setLoading(true);
    api.get("/work-orders", {
      params: { status: statusFilter || undefined, limit: 100 },
    })
      .then((r) => setOrders(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]);

  const filtered = orders.filter(
    (o) =>
      (!search ||
        o.number.toLowerCase().includes(search.toLowerCase()) ||
        o.title.toLowerCase().includes(search.toLowerCase())) &&
      (!typeFilter || o.maintenance_type === typeFilter)
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Ordens de Serviço</h1>
            <p className="text-slate-500 text-sm">{filtered.length} registros</p>
          </div>
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> Nova OS
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Buscar por número ou título..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todos os status</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">Todos os tipos</option>
            {Object.entries(MAINTENANCE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <button onClick={load} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
            <RefreshCw size={15} className="text-slate-500" />
          </button>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["Número", "Título", "Ativo", "Tipo", "Equipe / Terceirizada", "Horas Int.", "Horas Terc.", "Prioridade", "Status", "Prazo", "Ações"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={11} className="text-center py-10 text-slate-400">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-10 text-slate-400">Nenhuma OS encontrada</td></tr>
              ) : filtered.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-blue-700">{o.number}</td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="truncate font-medium text-slate-800">{o.title}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{o.asset_id?.slice(0, 8)}...</td>
                  <td className="px-4 py-3">
                    <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", MAINTENANCE_BADGE[o.maintenance_type] || "bg-gray-100 text-gray-600")}>
                      {MAINTENANCE_LABEL[o.maintenance_type] || o.maintenance_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {o.team_id ? (
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        🏢 Interna
                      </span>
                    ) : null}
                    {o.contractor_name ? (
                      <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-medium mt-1">
                        🔧 {o.contractor_name}
                      </span>
                    ) : null}
                    {!o.team_id && !o.contractor_name ? (
                      <span className="text-slate-400">—</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-center">
                    {o.internal_hours != null ? (
                      <span className="font-semibold text-blue-700">{o.internal_hours}h</span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-center">
                    {o.contractor_hours != null ? (
                      <span className="font-semibold text-orange-600">{o.contractor_hours}h</span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", PRIORITY_BADGE[o.priority])}>
                      {o.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", STATUS_BADGE[o.status])}>
                      {STATUS_LABEL[o.status] || o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {o.scheduled_end ? new Date(o.scheduled_end).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-blue-600 hover:underline text-xs">Ver</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
