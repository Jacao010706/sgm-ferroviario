"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import { ArrowLeft, Wrench, Calendar } from "lucide-react";
import clsx from "clsx";
const STATUS_BADGE: Record<string, string> = { operational: "bg-green-100 text-green-700", maintenance: "bg-amber-100 text-amber-700", failure: "bg-red-100 text-red-700", standby: "bg-slate-100 text-slate-600", decommissioned: "bg-gray-100 text-gray-400" };
const STATUS_LABEL: Record<string, string> = { operational: "Operacional", maintenance: "Manutencao", failure: "Falha", standby: "Reserva", decommissioned: "Desativado" };
const TYPE_LABEL: Record<string, string> = { substation: "Subestacao", generator: "Gerador", transformer: "Transformador", rectifier: "Retificador", inverter: "Inversor", switchgear: "Painel", catenary: "Catenaria", battery_bank: "Banco Baterias", circuit_breaker: "Disjuntor", measurement: "Medicao", cooling: "Refrigeracao", other: "Outro" };
export default function AssetDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [asset, setAsset] = useState<any>(null);
  const [kids, setKids] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get(`/assets/${id}`),
      api.get("/assets", { params: { limit: 200 } }),
      api.get("/work-orders", { params: { asset_id: id, limit: 20 } }),
    ]).then(([assetRes, allRes, woRes]) => {
      setAsset(assetRes.data);
      setKids(allRes.data.filter((a: any) => a.parent_id === id));
      setWorkOrders(woRes.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);
  if (loading) return <div className="flex min-h-screen bg-slate-50"><Sidebar /><main className="flex-1 p-6 flex items-center justify-center text-slate-400">Carregando...</main></div>;
  if (!asset) return <div className="flex min-h-screen bg-slate-50"><Sidebar /><main className="flex-1 p-6 flex items-center justify-center text-slate-400">Ativo nao encontrado</main></div>;
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 text-sm"><ArrowLeft size={16} /> Voltar</button>
        <div className="flex items-start justify-between mb-6">
          <div>
            <span className="font-mono text-blue-700 font-bold text-lg">{asset.tag}</span>
            <h1 className="text-2xl font-bold text-slate-800">{asset.name}</h1>
            <p className="text-slate-500 text-sm">{TYPE_LABEL[asset.asset_type] || asset.asset_type}</p>
          </div>
          <span className={clsx("px-3 py-1 rounded-full text-sm font-medium", STATUS_BADGE[asset.status])}>{STATUS_LABEL[asset.status] || asset.status}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-700 mb-3">Informacoes</h2>
            <dl className="space-y-2 text-sm">
              {asset.manufacturer && <div className="flex justify-between"><dt className="text-slate-500">Fabricante</dt><dd className="font-medium">{asset.manufacturer}</dd></div>}
              {asset.model && <div className="flex justify-between"><dt className="text-slate-500">Modelo</dt><dd className="font-medium">{asset.model}</dd></div>}
              {asset.serial_number && <div className="flex justify-between"><dt className="text-slate-500">Nr. Serie</dt><dd className="font-medium">{asset.serial_number}</dd></div>}
              {asset.location_description && <div className="flex justify-between"><dt className="text-slate-500">Localizacao</dt><dd className="font-medium">{asset.location_description}</dd></div>}
              {asset.installation_date && <div className="flex justify-between"><dt className="text-slate-500">Instalacao</dt><dd className="font-medium">{new Date(asset.installation_date).toLocaleDateString("pt-BR")}</dd></div>}
            </dl>
          </div>
          {kids.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-700 mb-3">Subativos ({kids.length})</h2>
              <ul className="space-y-2">
                {kids.map(c => (
                  <li key={c.id} className="flex items-center justify-between text-sm">
                    <span className="font-mono text-blue-700">{c.tag}</span>
                    <span className="text-slate-600">{c.name}</span>
                    <span className={clsx("px-2 py-0.5 rounded-full text-xs", STATUS_BADGE[c.status])}>{STATUS_LABEL[c.status]}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-3"><Wrench size={16} className="text-slate-500" /><h2 className="font-semibold text-slate-700">Ordens de Servico</h2></div>
          {workOrders.length === 0 ? <p className="text-slate-400 text-sm">Nenhuma ordem de servico encontrada.</p> : (
            <ul className="divide-y divide-slate-100">
              {workOrders.map(wo => (
                <li key={wo.id} className="py-3 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{wo.title}</span>
                  <span className="text-slate-500 flex items-center gap-1"><Calendar size={12}/>{new Date(wo.created_at).toLocaleDateString("pt-BR")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {asset.notes && <div className="bg-white rounded-xl border border-slate-200 p-5 mt-4"><h2 className="font-semibold text-slate-700 mb-2">Observacoes</h2><p className="text-slate-600 text-sm">{asset.notes}</p></div>}
      </main>
    </div>
  );
}