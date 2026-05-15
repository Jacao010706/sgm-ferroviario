﻿"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import { BarChart2, TrendingUp, Clock, AlertTriangle } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
const COLORS = ["#2563EB", "#16A34A", "#D97706", "#DC2626", "#6B7280"];
export default function ReportsPage() {
  const [assetSummary, setAssetSummary] = useState<any>({});
  const [woKpis, setWoKpis] = useState<any>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([
      api.get("/assets/summary").then((r) => setAssetSummary(r.data)),
      api.get("/work-orders/kpis").then((r) => setWoKpis(r.data)),
    ]).finally(() => setLoading(false));
  }, []);
  const assetStatusData = Object.entries(assetSummary.by_status || {}).map(([k, v], i) => ({ name: k, value: v as number, fill: COLORS[i] }));
  const assetTypeData = Object.entries(assetSummary.by_type || {}).map(([k, v]) => ({ name: k.replace("_", " "), value: v as number }));
  const woStatusData = Object.entries(woKpis.by_status || {}).map(([k, v]) => ({ name: k.replace("_", " "), value: v as number }));
  const woPriorityData = Object.entries(woKpis.by_priority || {}).map(([k, v], i) => ({ name: k, value: v as number, fill: COLORS[i] }));
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Relatorios</h1>
          <p className="text-slate-500 text-sm">Indicadores e metricas do sistema</p>
        </div>
        {loading ? <p className="text-center text-slate-400 py-20">Carregando...</p> : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4 flex gap-3 items-center">
                <div className="p-2 bg-blue-50 rounded-lg"><BarChart2 size={20} className="text-blue-600" /></div>
                <div><p className="text-2xl font-bold text-slate-800">{assetSummary.total || 0}</p><p className="text-xs text-slate-500">Total de Ativos</p></div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 flex gap-3 items-center">
                <div className="p-2 bg-amber-50 rounded-lg"><Clock size={20} className="text-amber-600" /></div>
                <div><p className="text-2xl font-bold text-slate-800">{woKpis.open || 0}</p><p className="text-xs text-slate-500">OS em Aberto</p></div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 flex gap-3 items-center">
                <div className="p-2 bg-red-50 rounded-lg"><AlertTriangle size={20} className="text-red-600" /></div>
                <div><p className="text-2xl font-bold text-slate-800">{woKpis.overdue || 0}</p><p className="text-xs text-slate-500">OS Atrasadas</p></div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 flex gap-3 items-center">
                <div className="p-2 bg-green-50 rounded-lg"><TrendingUp size={20} className="text-green-600" /></div>
                <div><p className="text-2xl font-bold text-slate-800">{woKpis.avg_duration_hours || 0}h</p><p className="text-xs text-slate-500">MTTR Medio</p></div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h2 className="font-semibold text-slate-700 mb-4">Status dos Ativos</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={assetStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                      {assetStatusData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h2 className="font-semibold text-slate-700 mb-4">Ativos por Tipo</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={assetTypeData}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#2563EB" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h2 className="font-semibold text-slate-700 mb-4">OS por Status</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={woStatusData}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#16A34A" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h2 className="font-semibold text-slate-700 mb-4">OS por Prioridade</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={woPriorityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                      {woPriorityData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
