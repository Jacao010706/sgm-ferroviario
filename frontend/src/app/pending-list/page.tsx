"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import { RefreshCw, AlertTriangle, Clock, ChevronDown, ChevronUp, MapPin, Filter } from "lucide-react";
import clsx from "clsx";

const STATUS_LABEL: Record<string, string> = { pending: "Pendente", assigned: "Atribuida", in_progress: "Em Execucao", paused: "Pausada", waiting_parts: "Ag. Pecas", waiting_approval: "Ag. Aprovacao" };
const STATUS_COLOR: Record<string, string> = { pending: "bg-slate-100 text-slate-600", assigned: "bg-blue-100 text-blue-700", in_progress: "bg-indigo-100 text-indigo-700", paused: "bg-yellow-100 text-yellow-700", waiting_parts: "bg-orange-100 text-orange-700", waiting_approval: "bg-purple-100 text-purple-700" };
const PRIORITY_COLOR: Record<string, string> = { critical: "border-l-red-600", high: "border-l-orange-500", medium: "border-l-amber-400", low: "border-l-green-400" };
const PRIORITY_LABEL: Record<string, string> = { critical: "Critica", high: "Alta", medium: "Media", low: "Baixa" };
const MAINTENANCE_LABEL: Record<string, string> = { preventive: "Preventiva", corrective: "Corretiva", emergency: "Emergencial", predictive: "Preditiva", inspection: "Inspecao", calibration: "Calibracao" };

export default function PendingListPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filterPriority, setFilterPriority] = useState("");
  const [filterType, setFilterType] = useState("");
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get("/work-orders/", { params: { limit: 500 } }).then(r => setOrders(r.data)),
      api.get("/assets/", { params: { limit: 200 } }).then(r => setAssets(r.data)),
      api.get("/locations/").then(r => setLocations(r.data)),
    ]).finally(() => { setLoading(false); setLastUpdate(new Date()); });
  };

  useEffect(() => { load(); const interval = setInterval(load, 60000); return () => clearInterval(interval); }, []);

  const pendingStatuses = ["pending", "assigned", "in_progress", "paused", "waiting_parts", "waiting_approval"];

  const pending = orders.filter(o => {
    if (!pendingStatuses.includes(o.status)) return false;
    if (filterPriority && o.priority !== filterPriority) return false;
    if (filterType && o.maintenance_type !== filterType) return false;
    return true;
  });

  const getAsset = (id: string) => assets.find(a => a.id === id);
  const getLocation = (id: string) => locations.find(l => l.id === id);

  const byLocation: Record<string, any[]> = {};
  const noLocation: any[] = [];

  pending.forEach(o => {
    const asset = getAsset(o.asset_id);
    const locId = asset?.location_id;
    if (locId) {
      if (!byLocation[locId]) byLocation[locId] = [];
      byLocation[locId].push(o);
    } else {
      noLocation.push(o);
    }
  });

  const toggleExpand = (id: string) => {
    const s = new Set(expanded);
    s.has(id) ? s.delete(id) : s.add(id);
    setExpanded(s);
  };

  const isOverdue = (o: any) => o.scheduled_end && new Date(o.scheduled_end) < new Date();

  const inp = "border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  const OSRow = ({ o }: { o: any }) => {
    const asset = getAsset(o.asset_id);
    const overdue = isOverdue(o);
    return (
      <div className={clsx("border-l-4 bg-white rounded-r-lg mb-2 shadow-sm", PRIORITY_COLOR[o.priority] || "border-l-slate-300", overdue && "ring-1 ring-red-300")}>
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-blue-700 text-xs">{o.number}</span>
              <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", STATUS_COLOR[o.status])}>{STATUS_LABEL[o.status]}</span>
              {overdue && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 flex items-center gap-1"><AlertTriangle size={10} /> VENCIDA</span>}
            </div>
            <p className="text-sm font-medium text-slate-800 truncate">{o.title}</p>
            <p className="text-xs text-slate-500">{asset?.name || "-"} · {MAINTENANCE_LABEL[o.maintenance_type]} · Prioridade: {PRIORITY_LABEL[o.priority]}</p>
          </div>
          <div className="text-right text-xs text-slate-500 shrink-0">
            {o.scheduled_start && <p>Prev: {new Date(o.scheduled_start).toLocaleDateString("pt-BR")}</p>}
            {o.scheduled_end && <p className={overdue ? "text-red-600 font-semibold" : ""}>Prazo: {new Date(o.scheduled_end).toLocaleDateString("pt-BR")}</p>}
          </div>
        </div>
      </div>
    );
  };

  const LocationBlock = ({ locId, orders }: { locId: string, orders: any[] }) => {
    const loc = getLocation(locId);
    const isOpen = expanded.has(locId);
    const overdueCount = orders.filter(isOverdue).length;
    const criticalCount = orders.filter(o => o.priority === "critical").length;
    return (
      <div className="bg-white rounded-xl border border-slate-200 mb-4 overflow-hidden shadow-sm">
        <div className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-slate-50 border-b border-slate-100" onClick={() => toggleExpand(locId)}>
          <MapPin size={16} className="text-blue-600 shrink-0" />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-800">{loc?.name || "Localidade"}</h3>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">{orders.length} pendente{orders.length !== 1 ? "s" : ""}</span>
              {overdueCount > 0 && <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded-full text-xs font-medium flex items-center gap-1"><AlertTriangle size={10} /> {overdueCount} vencida{overdueCount !== 1 ? "s" : ""}</span>}
              {criticalCount > 0 && <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs font-medium">{criticalCount} critica{criticalCount !== 1 ? "s" : ""}</span>}
            </div>
          </div>
          {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
        {isOpen && (
          <div className="p-4">
            {orders.sort((a,b) => {
              const pOrder = {critical:0,high:1,medium:2,low:3};
              return (pOrder[a.priority as keyof typeof pOrder]||2) - (pOrder[b.priority as keyof typeof pOrder]||2);
            }).map(o => <OSRow key={o.id} o={o} />)}
          </div>
        )}
      </div>
    );
  };

  const totalOverdue = pending.filter(isOverdue).length;
  const totalCritical = pending.filter(o => o.priority === "critical").length;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Lista de Pendencias SAEE</h1>
            <p className="text-xs text-slate-400 mt-0.5">Atualizado: {lastUpdate.toLocaleTimeString("pt-BR")} · Atualiza automaticamente a cada 1 min</p>
          </div>
          <button onClick={load} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 bg-white"><RefreshCw size={15} className={clsx("text-slate-500", loading && "animate-spin")} /></button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-100 p-4 flex gap-3 items-center shadow-sm">
            <div className="p-2 bg-amber-50 rounded-lg"><Clock size={18} className="text-amber-600" /></div>
            <div><p className="text-2xl font-bold text-slate-800">{pending.length}</p><p className="text-xs text-slate-500">Total Pendentes</p></div>
          </div>
          <div className="bg-white rounded-xl border border-red-100 p-4 flex gap-3 items-center shadow-sm">
            <div className="p-2 bg-red-50 rounded-lg"><AlertTriangle size={18} className="text-red-600" /></div>
            <div><p className="text-2xl font-bold text-red-700">{totalOverdue}</p><p className="text-xs text-slate-500">Vencidas</p></div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4 flex gap-3 items-center shadow-sm">
            <div className="p-2 bg-red-50 rounded-lg"><AlertTriangle size={18} className="text-red-800" /></div>
            <div><p className="text-2xl font-bold text-slate-800">{totalCritical}</p><p className="text-xs text-slate-500">Criticas</p></div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4 flex gap-3 items-center shadow-sm">
            <div className="p-2 bg-blue-50 rounded-lg"><MapPin size={18} className="text-blue-600" /></div>
            <div><p className="text-2xl font-bold text-slate-800">{Object.keys(byLocation).length}</p><p className="text-xs text-slate-500">Estacoes c/ Pendencias</p></div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 flex gap-3 flex-wrap items-center">
          <Filter size={15} className="text-slate-400" />
          <select className={inp} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
            <option value="">Todas as prioridades</option>
            <option value="critical">Critica</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baixa</option>
          </select>
          <select className={inp} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">Todos os tipos</option>
            <option value="preventive">Preventiva</option>
            <option value="corrective">Corretiva</option>
            <option value="emergency">Emergencial</option>
            <option value="inspection">Inspecao</option>
          </select>
          <button onClick={() => { setExpanded(new Set([...Object.keys(byLocation), "no-location"])); }} className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700">Expandir Tudo</button>
          <button onClick={() => setExpanded(new Set())} className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700">Recolher Tudo</button>
        </div>

        {loading ? <p className="text-center text-slate-400 py-10">Carregando...</p> : (
          <>
            {Object.entries(byLocation).map(([locId, ords]) => (
              <LocationBlock key={locId} locId={locId} orders={ords} />
            ))}
            {noLocation.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 mb-4 overflow-hidden shadow-sm">
                <div className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-slate-50 border-b border-slate-100" onClick={() => toggleExpand("no-location")}>
                  <MapPin size={16} className="text-slate-400 shrink-0" />
                  <h3 className="font-bold text-slate-600 flex-1">Sem Localidade Definida</h3>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">{noLocation.length} pendente{noLocation.length !== 1 ? "s" : ""}</span>
                  {expanded.has("no-location") ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </div>
                {expanded.has("no-location") && (
                  <div className="p-4">{noLocation.map(o => <OSRow key={o.id} o={o} />)}</div>
                )}
              </div>
            )}
            {pending.length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Clock size={32} className="text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400">Nenhuma OS pendente no momento!</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

