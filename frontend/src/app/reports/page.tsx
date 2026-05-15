"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import { BarChart2, TrendingUp, Clock, AlertTriangle } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
const COLORS = ["#2563EB", "#16A34A", "#D97706", "#DC2626", "#6B7280"];
const ML: Record<string, string> = { preventive: "Preventiva", corrective: "Corretiva", emergency: "Emergencial", predictive: "Preditiva", inspection: "Inspecao", calibration: "Calibracao" };
const MC: Record<string, string> = { preventive: "#2563EB", corrective: "#DC2626", emergency: "#9F1239", predictive: "#7C3AED", inspection: "#0D9488", calibration: "#6B7280" };
export default function ReportsPage() {
  const [assetSummary, setAssetSummary] = useState<any>({});
  const [woKpis, setWoKpis] = useState<any>({});
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([
      api.get("/assets/summary").then((r) => setAssetSummary(r.data)),
      api.get("/work-orders/kpis").then((r) => setWoKpis(r.data)),
      api.get("/work-orders", { params: { limit: 500 } }).then((r) => setOrders(r.data)),
    ]).finally(() => setLoading(false));
  }, []);
  const aSD = Object.entries(assetSummary.by_status || {}).map(([k, v], i) => ({ name: k, value: v as number, fill: COLORS[i] }));
  const aTD = Object.entries(assetSummary.by_type || {}).map(([k, v]) => ({ name: k.replace("_"," "), value: v as number }));
  const wSD = Object.entries(woKpis.by_status || {}).map(([k, v]) => ({ name: k.replace("_"," "), value: v as number }));
  const wPD = Object.entries(woKpis.by_priority || {}).map(([k, v], i) => ({ name: k, value: v as number, fill: COLORS[i] }));
  const hBT = Object.entries(orders.reduce((a:any,o) => { const t=o.maintenance_type||"u"; if(!a[t]) a[t]={i:0,c:0}; a[t].i+=o.internal_hours||0; a[t].c+=o.contractor_hours||0; return a; },{})).map(([t,h]:any) => ({ name: ML[t]||t, "Horas Internas": Math.round(h.i*10)/10, "Horas Terceirizadas": Math.round(h.c*10)/10 }));
  const tI = orders.reduce((s,o) => s+(o.internal_hours||0), 0);
  const tC = orders.reduce((s,o) => s+(o.contractor_hours||0), 0);
  const hCD = [{ name:"Internas", value:Math.round(tI*10)/10, fill:"#2563EB" },{ name:"Terceirizadas", value:Math.round(tC*10)/10, fill:"#EA580C" }];
  const wBT = Object.entries(orders.reduce((a:any,o) => { const t=o.maintenance_type||"u"; a[t]=(a[t]||0)+1; return a; },{})).map(([t,c]) => ({ name:ML[t]||t, value:c as number, fill:MC[t]||"#6B7280" }));
  return (<div className="flex min-h-screen bg-slate-50"><Sidebar /><main className="flex-1 p-6 overflow-auto">
    <div className="mb-6"><h1 className="text-2xl font-bold text-slate-800">Relatorios</h1><p className="text-slate-500 text-sm">Indicadores e metricas</p></div>
    {loading ? <p className="text-center py-20 text-slate-400">Carregando...</p> : (<div className="space-y-6">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex gap-3 items-center"><div className="p-2 bg-blue-50 rounded-lg"><BarChart2 size={20} className="text-blue-600"/></div><div><p className="text-2xl font-bold">{assetSummary.total||0}</p><p className="text-xs text-slate-500">Total Ativos</p></div></div>
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex gap-3 items-center"><div className="p-2 bg-amber-50 rounded-lg"><Clock size={20} className="text-amber-600"/></div><div><p className="text-2xl font-bold">{woKpis.open||0}</p><p className="text-xs text-slate-500">OS em Aberto</p></div></div>
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex gap-3 items-center"><div className="p-2 bg-red-50 rounded-lg"><AlertTriangle size={20} className="text-red-600"/></div><div><p className="text-2xl font-bold">{woKpis.overdue||0}</p><p className="text-xs text-slate-500">OS Atrasadas</p></div></div>
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex gap-3 items-center"><div className="p-2 bg-green-50 rounded-lg"><TrendingUp size={20} className="text-green-600"/></div><div><p className="text-2xl font-bold">{woKpis.avg_duration_hours||0}h</p><p className="text-xs text-slate-500">MTTR Medio</p></div></div>
    </div>
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h2 className="font-semibold text-slate-700 mb-1">Horas por Tipo de Manutencao</h2>
      <p className="text-xs text-slate-400 mb-4">Internas vs Terceirizadas por tipo</p>
      <ResponsiveContainer width="100%" height={260}><BarChart data={hBT}><XAxis dataKey="name" tick={{fontSize:11}}/><YAxis tick={{fontSize:10}}/><Tooltip/><Bar dataKey="Horas Internas" fill="#2563EB" radius={[4,4,0,0]}/><Bar dataKey="Horas Terceirizadas" fill="#EA580C" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5"><h2 className="font-semibold text-slate-700 mb-4">Total Horas</h2><div className="flex items-center gap-4"><ResponsiveContainer width="50%" height={160}><PieChart><Pie data={hCD} dataKey="value" cx="50%" cy="50%" outerRadius={65}>{hCD.map((e,i)=><Cell key={i} fill={e.fill}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer><div><p className="text-xs text-slate-500">Internas</p><p className="text-xl font-bold text-blue-600">{Math.round(tI*10)/10}h</p><p className="text-xs text-slate-500 mt-2">Terceirizadas</p><p className="text-xl font-bold text-orange-600">{Math.round(tC*10)/10}h</p></div></div></div>
      <div className="bg-white rounded-xl border border-slate-200 p-5"><h2 className="font-semibold text-slate-700 mb-4">OS por Tipo</h2><ResponsiveContainer width="100%" height={160}><PieChart><Pie data={wBT} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={({name,percent})=>name+" "+(percent*100).toFixed(0)+"%"}>{wBT.map((e,i)=><Cell key={i} fill={e.fill}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div>
      <div className="bg-white rounded-xl border border-slate-200 p-5"><h2 className="font-semibold text-slate-700 mb-4">Status dos Ativos</h2><ResponsiveContainer width="100%" height={200}><PieChart><Pie data={aSD} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75}>{aSD.map((e,i)=><Cell key={i} fill={e.fill}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div>
      <div className="bg-white rounded-xl border border-slate-200 p-5"><h2 className="font-semibold text-slate-700 mb-4">Ativos por Tipo</h2><ResponsiveContainer width="100%" height={200}><BarChart data={aTD}><XAxis dataKey="name" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/><Tooltip/><Bar dataKey="value" fill="#2563EB" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>
      <div className="bg-white rounded-xl border border-slate-200 p-5"><h2 className="font-semibold text-slate-700 mb-4">OS por Status</h2><ResponsiveContainer width="100%" height={200}><BarChart data={wSD}><XAxis dataKey="name" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/><Tooltip/><Bar dataKey="value" fill="#16A34A" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>
      <div className="bg-white rounded-xl border border-slate-200 p-5"><h2 className="font-semibold text-slate-700 mb-4">OS por Prioridade</h2><ResponsiveContainer width="100%" height={200}><PieChart><Pie data={wPD} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75}>{wPD.map((e,i)=><Cell key={i} fill={e.fill}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div>
    </div></div>)}</main></div>);
}
