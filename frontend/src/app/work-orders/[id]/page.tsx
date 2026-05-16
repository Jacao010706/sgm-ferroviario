"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import { ArrowLeft, Clock, User, Wrench, Calendar, Building } from "lucide-react";
import clsx from "clsx";
const PRIORITY_BADGE: Record<string, string> = { critical: "bg-red-100 text-red-700", high: "bg-orange-100 text-orange-700", medium: "bg-amber-100 text-amber-700", low: "bg-green-100 text-green-700" };
const PRIORITY_LABEL: Record<string, string> = { critical: "Critica", high: "Alta", medium: "Media", low: "Baixa" };
const STATUS_BADGE: Record<string, string> = { pending: "bg-slate-100 text-slate-600", assigned: "bg-blue-100 text-blue-700", in_progress: "bg-indigo-100 text-indigo-700", paused: "bg-yellow-100 text-yellow-700", waiting_parts: "bg-orange-100 text-orange-700", waiting_approval: "bg-purple-100 text-purple-700", completed: "bg-green-100 text-green-700", cancelled: "bg-slate-100 text-slate-400" };
const STATUS_LABEL: Record<string, string> = { pending: "Pendente", assigned: "Atribuida", in_progress: "Em Execucao", paused: "Pausada", waiting_parts: "Ag. Pecas", completed: "Concluida", cancelled: "Cancelada", waiting_approval: "Ag. Aprovacao" };
const MAINTENANCE_LABEL: Record<string, string> = { preventive: "Preventiva", corrective: "Corretiva", emergency: "Emergencial", predictive: "Preditiva", inspection: "Inspecao", calibration: "Calibracao" };
export default function WorkOrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!id) return;
    api.get(`/work-orders/${id}`).then(async (r) => {
      setOrder(r.data);
      if (r.data.asset_id) {
        api.get(`/assets/${r.data.asset_id}`).then(a => setAsset(a.data)).catch(() => {});
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);
  if (loading) return <div className="flex min-h-screen bg-slate-50"><Sidebar /><main className="flex-1 p-6 flex items-center justify-center text-slate-400">Carregando...</main></div>;
  if (!order) return <div className="flex min-h-screen bg-slate-50"><Sidebar /><main className="flex-1 p-6 flex items-center justify-center text-slate-400">OS nao encontrada</main></div>;
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 text-sm"><ArrowLeft size={16} /> Voltar</button>
        <div className="flex items-start justify-between mb-6">
          <div>
            <span className="font-mono text-blue-700 font-bold text-lg">{order.number}</span>
            <h1 className="text-2xl font-bold text-slate-800">{order.title}</h1>
            <p className="text-slate-500 text-sm">{MAINTENANCE_LABEL[order.maintenance_type] || order.maintenance_type}</p>
          </div>
          <div className="flex gap-2">
            <span className={clsx("px-3 py-1 rounded-full text-sm font-medium", PRIORITY_BADGE[order.priority])}>{PRIORITY_LABEL[order.priority] || order.priority}</span>
            <span className={clsx("px-3 py-1 rounded-full text-sm font-medium", STATUS_BADGE[order.status])}>{STATUS_LABEL[order.status] || order.status}</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-700 mb-3 flex items-center gap-2"><Wrench size={15}/> Detalhes</h2>
            <dl className="space-y-2 text-sm">
              {asset && <div className="flex justify-between"><dt className="text-slate-500">Ativo</dt><dd className="font-medium">{asset.name} <span className="font-mono text-blue-700">({asset.tag})</span></dd></div>}
              {order.description && <div className="flex flex-col gap-1"><dt className="text-slate-500">Descricao</dt><dd className="text-slate-700">{order.description}</dd></div>}
              {order.estimated_duration_h && <div className="flex justify-between"><dt className="text-slate-500">Duracao Estimada</dt><dd className="font-medium">{order.estimated_duration_h}h</dd></div>}
            </dl>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-700 mb-3 flex items-center gap-2"><Calendar size={15}/> Prazos</h2>
            <dl className="space-y-2 text-sm">
              {order.scheduled_start && <div className="flex justify-between"><dt className="text-slate-500">Inicio Previsto</dt><dd className="font-medium">{new Date(order.scheduled_start).toLocaleString("pt-BR")}</dd></div>}
              {order.scheduled_end && <div className="flex justify-between"><dt className="text-slate-500">Fim Previsto</dt><dd className="font-medium">{new Date(order.scheduled_end).toLocaleString("pt-BR")}</dd></div>}
              {order.actual_start && <div className="flex justify-between"><dt className="text-slate-500">Inicio Real</dt><dd className="font-medium">{new Date(order.actual_start).toLocaleString("pt-BR")}</dd></div>}
              {order.actual_end && <div className="flex justify-between"><dt className="text-slate-500">Fim Real</dt><dd className="font-medium">{new Date(order.actual_end).toLocaleString("pt-BR")}</dd></div>}
              <div className="flex justify-between"><dt className="text-slate-500">Criada em</dt><dd className="font-medium">{new Date(order.created_at).toLocaleString("pt-BR")}</dd></div>
            </dl>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-700 mb-3 flex items-center gap-2"><Building size={15}/> Execucao</h2>
            <dl className="space-y-2 text-sm">
              {order.contractor_name && <div className="flex justify-between"><dt className="text-slate-500">Terceirizada</dt><dd className="font-medium">{order.contractor_name}</dd></div>}
              {order.contractor_document && <div className="flex justify-between"><dt className="text-slate-500">CNPJ</dt><dd className="font-medium">{order.contractor_document}</dd></div>}
              {order.internal_hours != null && <div className="flex justify-between"><dt className="text-slate-500">Horas Internas</dt><dd className="font-medium text-blue-700">{order.internal_hours}h</dd></div>}
              {order.contractor_hours != null && <div className="flex justify-between"><dt className="text-slate-500">Horas Terceirizadas</dt><dd className="font-medium text-orange-600">{order.contractor_hours}h</dd></div>}
              {!order.contractor_name && !order.internal_hours && <p className="text-slate-400">Nenhuma informacao de execucao.</p>}
            </dl>
          </div>
          {order.notes && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-700 mb-2">Observacoes</h2>
              <p className="text-slate-600 text-sm">{order.notes}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}