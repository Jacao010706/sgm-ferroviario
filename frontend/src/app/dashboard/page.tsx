"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import {
  CheckCircle, AlertTriangle, Clock, TrendingUp,
  Zap, Thermometer, Activity,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";

const PRIORITY_COLORS = {
  critical: "#DC2626",
  high: "#EA580C",
  medium: "#D97706",
  low: "#16A34A",
};

const STATUS_COLORS = {
  operational: "#16A34A",
  maintenance: "#D97706",
  failure: "#DC2626",
  standby: "#6B7280",
};

type KpiCard = { label: string; value: string | number; icon: React.ReactNode; color: string; sub?: string };

function KpiCard({ label, value, icon, color, sub }: KpiCard) {
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
  const [assetSummary, setAssetSummary] = useState<any>({});
  const [woKpis, setWoKpis] = useState<any>({});
  const [activeAlerts, setActiveAlerts] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/assets/summary").then((r) => setAssetSummary(r.data)),
      api.get("/work-orders/kpis").then((r) => setWoKpis(r.data)),
      api.get("/alerts/active-count").then((r) => setActiveAlerts(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  const assetStatusData = Object.entries(assetSummary.by_status || {}).map(([k, v]) => ({
    name: k, value: v, fill: STATUS_COLORS[k as keyof typeof STATUS_COLORS] || "#94A3B8",
  }));

  const woTypeData = Object.entries(assetSummary.by_type || {}).map(([k, v]) => ({
    name: k.replace("_", " "), value: v as number,
  }));

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500 text-sm">Visão geral — {new Date().toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            label="Ativos Operacionais"
            value={assetSummary.by_status?.operational ?? "—"}
            icon={<CheckCircle size={22} className="text-green-600" />}
            color="bg-green-50"
            sub={`de ${assetSummary.total ?? 0} no total`}
          />
          <KpiCard
            label="Alertas Críticos"
            value={activeAlerts.critical ?? 0}
            icon={<AlertTriangle size={22} className="text-red-600" />}
            color="bg-red-50"
            sub={`+${activeAlerts.high ?? 0} alta prioridade`}
          />
          <KpiCard
            label="OS em Aberto"
            value={woKpis.open ?? "—"}
            icon={<Clock size={22} className="text-amber-600" />}
            color="bg-amber-50"
            sub={`${woKpis.overdue ?? 0} atrasadas`}
          />
          <KpiCard
            label="MTTR Médio"
            value={`${woKpis.avg_duration_hours ?? 0}h`}
            icon={<TrendingUp size={22} className="text-blue-600" />}
            color="bg-blue-50"
            sub="tempo médio de reparo"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Status dos ativos */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <h2 className="font-semibold text-slate-700 mb-4">Status dos Ativos</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={assetStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {assetStatusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Tipo de equipamentos */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 col-span-2">
            <h2 className="font-semibold text-slate-700 mb-4">Ativos por Tipo</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={woTypeData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alertas recentes */}
        <AlertsPanel />
      </main>
    </div>
  );
}

function AlertsPanel() {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    api.get("/alerts", { params: { status: "active", limit: 10 } }).then((r) => setAlerts(r.data));
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
        <AlertTriangle size={18} className="text-amber-500" /> Alertas Ativos
      </h2>
      {alerts.length === 0 ? (
        <p className="text-slate-400 text-sm py-4 text-center">Nenhum alerta ativo</p>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => (
            <div key={a.id} className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${severityClass[a.severity] || ""}`}>
              <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{a.title}</p>
                <p className="text-xs opacity-70 mt-0.5">
                  {new Date(a.triggered_at).toLocaleString("pt-BR")} — {a.source}
                </p>
              </div>
              <button
                className="text-xs underline opacity-70 hover:opacity-100 whitespace-nowrap"
                onClick={() => api.post(`/alerts/${a.id}/acknowledge`)}
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
