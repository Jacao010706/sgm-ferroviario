"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import { Plus, Search, RefreshCw } from "lucide-react";
import clsx from "clsx";

const STATUS_BADGE: Record<string, string> = {
  operational:    "bg-green-100 text-green-700",
  maintenance:    "bg-amber-100 text-amber-700",
  failure:        "bg-red-100 text-red-700",
  standby:        "bg-slate-100 text-slate-600",
  decommissioned: "bg-gray-100 text-gray-400",
};

const STATUS_LABEL: Record<string, string> = {
  operational: "Operacional", maintenance: "Manutencao",
  failure: "Falha", standby: "Reserva", decommissioned: "Desativado",
};

const TYPE_LABEL: Record<string, string> = {
  substation: "Subestacao", generator: "Gerador", transformer: "Transformador",
  rectifier: "Retificador", inverter: "Inversor", switchgear: "Painel",
  catenary: "Catenaria", battery_bank: "Banco Baterias",
  circuit_breaker: "Disjuntor", measurement: "Medicao",
  cooling: "Refrigeracao", other: "Outro",
};

export default function AssetsPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const load = () => {
    setLoading(true);
    api.get("/assets", { params: { status: statusFilter || undefined, asset_type: typeFilter || undefined, limit: 100 } })
      .then((r) => setAssets(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter, typeFilter]);

  const filtered = assets.filter(
    (a) => !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.tag.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Ativos</h1>
            <p className="text-slate-500 text-sm">{filtered.length} registros</p>
          </div>
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus size={16} /> Novo Ativo
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Buscar por nome ou tag..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos os status</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">Todos os tipos</option>
            {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button onClick={load} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
            <RefreshCw size={15} className="text-slate-500" />
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["Tag", "Nome", "Tipo", "Status", "Criticidade", "Fabricante", "Modelo", "Acoes"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400">Nenhum ativo encontrado</td></tr>
              ) : filtered.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-semibold text-blue-700">{a.tag}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{a.name}</td>
                  <td className="px-4 py-3 text-slate-500">{TYPE_LABEL[a.asset_type] || a.asset_type}</td>
                  <td className="px-4 py-3">
                    <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", STATUS_BADGE[a.status])}>
                      {STATUS_LABEL[a.status] || a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", a.criticality <= 2 ? "bg-red-100 text-red-700" : a.criticality === 3 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700")}>
                      P{a.criticality}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{a.manufacturer || "-"}</td>
                  <td className="px-4 py-3 text-slate-500">{a.model || "-"}</td>
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
