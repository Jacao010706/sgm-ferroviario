"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import {
  CheckCircle, AlertTriangle, Clock, TrendingUp,
  Wrench, BarChart2, RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip,
} from "recharts";
import clsx from "clsx";

const STATUS_COLORS: Record<string, string> = {
  operational: "#16A34A",
  maintenance: "#D97706",
  failure: "#DC2626",
  standby: "#6B7280",
};

const STATUS_PT: Record<string, string> = {
  operational: "Operacional",
  maintenance: "Manutencao",
  failure: "Falha",
  standby: "Reserva",
  decommissioned: "Desativado",
};

const TYPE_PT: Record<string, string> = {
  generator: "Gerador",
  transformer: "Transformador",
  substation: "Subestacao",
  rectifier: "Retificador",
  inverter: "Inversor",
  switchgear: "Painel",
  catenary: "Catenaria",
  battery_bank: "Banco Bat.",
  circuit_breaker: "Disjuntor",
  measurement: "Medicao",
  cooling: "Refrigeracao",
  other: "Outro",
};

const PRIORITY_BADGE: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-green-100 text-green-700",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-slate-100 text-slate-600",
  assigned: "bg-blue-100 text-blue-700",
  in_progress: "bg-indigo-100 text-indigo-700",
  paused: "bg-yellow-100 text-yellow-700",
  waiting_parts: "bg-orange-100 text-orange-700",
  waiting_approval: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-slate-100 text-slate-400",
};

const STATUS_WO_PT: Record<string, string> = {
  pending: "Pendente",
  assigned: "Atribuida",
  in_progress: "Em Execucao",
  paused: "Pausada",
  waiting_parts: "Ag. Pecas",
  completed: "Concluida",
  cancelled: "Cancelada",
  waiting_approval: "Ag. Aprovacao",
};

function KpiCard({ label, value, icon, color, sub }: { label: string; value: string | number; icon: React.ReactNode; color: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex gap-4 items-center">
      <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [assetSummary, setAssetSummary] = useState<any>({});
  const [woKpis, setWoKpis] = useState<any>({});
  const [activeAlerts, setActiveAlerts] = useState<any>({});
  const [recentWO, setRecentWO] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get("/assets/summary").then((r) => setAssetSummary(r.data)),
      api.get("/work-orders/kpis").then((r) => setWoKpis(r.data)),
      api.get("/alerts/active-count").then((r) => setActiveAlerts(r.data)),
      api.get("/work-orders", { params: { limit: 5 } }).then((r) => setRecentWO(r.data)),
      api.get("/assets/", { params: { limit: 100 } }).then((r) => setAssets(r.data)),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const assetStatusData = Object.entries(assetSummary.by_status || {}).map(([k, v]) => ({
    name: STATUS_PT[k] || k,
    value: v as number,
    fill: STATUS_COLORS[k] || "#94A3B8",
  }));

  const woTypeData = Object.entries(assetSummary.by_type || {}).map(([k, v]) => ({
    name: TYPE_PT[k] || k,
    value: v as number,
  }));

  const woStatusData = Object.entries(woKpis.by_status || {}).map(([k, v]) => ({
    name: STATUS_WO_PT[k] || k,
    value: v as number,
  }));

  const totalAssets = assetSummary.total ?? 0;
  const operationalAssets = assetSummary.by_status?.operational ?? 0;
  const availability = totalAssets > 0 ? Math.round((operationalAssets / totalAssets) * 100) : 0;
  const completedWO = woKpis.by_status?.completed ?? 0;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
            <p className="text-slate-500 text-sm">
              Visao geral — {new Date().toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <button onClick={load} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 bg-white">
            <RefreshCw size={15} className="text-slate-500" />
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            label="Ativos Operacionais"
            value={operationalAssets}
            icon={<CheckCircle size={22} className="text-green-600" />}
            color="bg-green-50"
            sub={`de ${totalAssets} no total`}
          />
          <KpiCard
            label="Disponibilidade"
            value={`${availability}%`}
            icon={<BarChart2 size={22} className="text-blue-600" />}
            color="bg-blue-50"
            sub={`${totalAssets - operationalAssets} ativos indisponiveis`}
          />
          <KpiCard
            label="OS em Aberto"
            value={woKpis.open ?? 0}
            icon={<Clock size={22} className="text-amber-600" />}
            color="bg-amber-50"
            sub={`${woKpis.overdue ?? 0} atrasadas`}
          />
          <KpiCard
            label="OS Concluidas"
            value={completedWO}
            icon={<Wrench size={22} className="text-indigo-600" />}
            color="bg-indigo-50"
            sub={`MTTR: ${woKpis.avg_duration_hours ?? 0}h`}
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            label="Alertas Criticos"
            value={activeAlerts.critical ?? 0}
            icon={<AlertTriangle size={22} className="text-red-600" />}
            color="bg-red-50"
            sub={`+${activeAlerts.high ?? 0} alta prioridade`}
          />
          <KpiCard
            label="Total OS"
            value={woKpis.total ?? 0}
            icon={<TrendingUp size={22} className="text-purple-600" />}
            color="bg-purple-50"
            sub="todas as ordens"
          />
          <KpiCard
            label="Ativos em Falha"
            value={assetSummary.by_status?.failure ?? 0}
            icon={<AlertTriangle size={22} className="text-red-500" />}
            color="bg-red-50"
            sub={`${assetSummary.by_status?.maintenance ?? 0} em manutencao`}
          />
          <KpiCard
            label="Ativos em Standby"
            value={assetSummary.by_status?.standby ?? 0}
            icon={<CheckCircle size={22} className="text-slate-500" />}
            color="bg-slate-50"
            sub="reserva fria"
          />
        </div>

        {/* Graficos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <h2 className="font-semibold text-slate-700 mb-4">Status dos Ativos</h2>
            {assetStatusData.length === 0 ? (
              <p className="text-center text-slate-400 py-16 text-sm">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={assetStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {assetStatusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <h2 className="font-semibold text-slate-700 mb-4">OS por Status</h2>
            {woStatusData.length === 0 ? (
              <p className="text-center text-slate-400 py-16 text-sm">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={woStatusData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#6366F1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <h2 className="font-semibold text-slate-700 mb-4">Ativos por Tipo</h2>
            {woTypeData.length === 0 ? (
              <p className="text-center text-slate-400 py-16 text-sm">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={woTypeData}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#2563EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* OS Recentes + Alertas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* OS Recentes */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                <Wrench size={16} className="text-slate-500" /> Ultimas OS
              </h2>
              <button onClick={() => router.push("/work-orders")} className="text-xs text-blue-600 hover:underline">Ver todas</button>
            </div>
            {recentWO.length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-sm">Nenhuma OS encontrada</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentWO.map((wo) => (
                  <div key={wo.id} className="py-3 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{wo.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {assets.find(a => a.id === wo.asset_id)?.name || "Ativo"} — {new Date(wo.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", PRIORITY_BADGE[wo.priority])}>{wo.priority}</span>
                      <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", STATUS_BADGE[wo.status])}>{STATUS_WO_PT[wo.status] || wo.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Alertas Ativos */}
          <AlertsPanel />
        </div>
      </main>
    </div>
  );
}

function AlertsPanel() {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    api.get("/alerts", { params: { status: "active", limit: 5 } }).then((r) => setAlerts(r.data)).catch(() => {});
  }, []);

  const severityClass: Record<string, string> = {
    critical: "bg-red-100 text-red-700 border-red-200",
    high:     "bg-orange-100 text-orange-700 border-orange-200",
    medium:   "bg-amber-100 text-amber-700 border-amber-200",
    low:      "bg-green-100 text-green-700 border-green-200",
  };

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
      <h2 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
        <AlertTriangle size={16} className="text-amber-500" /> Alertas Ativos
      </h2>
      {alerts.length === 0 ? (
        <p className="text-slate-400 text-sm py-8 text-center">Nenhum alerta ativo</p>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => (
            <div key={a.id} className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${severityClass[a.severity] || ""}`}>
              <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{a.title}</p>
                <p className="text-xs opacity-70 mt-0.5">
                  {new Date(a.triggered_at).toLocaleString("pt-BR")}
                </p>
              </div>
              <button
                className="text-xs underline opacity-70 hover:opacity-100 whitespace-nowrap"
                onClick={() => api.post(`/alerts/${a.id}/acknowledge`).catch(() => {})}
              >
                Reconhecer
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
