"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import { FileText, Download, RefreshCw, Filter, BarChart2, Wrench, CheckCircle, Clock } from "lucide-react";
import clsx from "clsx";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente", assigned: "Atribuida", in_progress: "Em Execucao",
  paused: "Pausada", waiting_parts: "Ag. Pecas", completed: "Concluida",
  cancelled: "Cancelada", waiting_approval: "Ag. Aprovacao",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-slate-100 text-slate-600", assigned: "bg-blue-100 text-blue-700",
  in_progress: "bg-indigo-100 text-indigo-700", paused: "bg-yellow-100 text-yellow-700",
  waiting_parts: "bg-orange-100 text-orange-700", waiting_approval: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700", cancelled: "bg-slate-100 text-slate-400",
};

const PRIORITY_LABEL: Record<string, string> = {
  critical: "Critica", high: "Alta", medium: "Media", low: "Baixa",
};

const PRIORITY_BADGE: Record<string, string> = {
  critical: "bg-red-100 text-red-700", high: "bg-orange-100 text-orange-700",
  medium: "bg-amber-100 text-amber-700", low: "bg-green-100 text-green-700",
};

const TYPE_LABEL: Record<string, string> = {
  preventive: "Preventiva", corrective: "Corretiva", emergency: "Emergencial",
  predictive: "Preditiva", inspection: "Inspecao", calibration: "Calibracao",
};

export default function ReportsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [assetFilter, setAssetFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [generating, setGenerating] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get("/work-orders", {
        params: {
          status: statusFilter || undefined,
          maintenance_type: typeFilter || undefined,
          asset_id: assetFilter || undefined,
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          limit: 200,
        }
      }).then((r) => setOrders(r.data)),
      api.get("/assets/", { params: { limit: 100 } }).then((r) => setAssets(r.data)),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const totalHours = orders.reduce((acc, o) => acc + (o.actual_duration_h || 0) + (o.internal_hours || 0) + (o.contractor_hours || 0), 0);
  const completed = orders.filter(o => o.status === "completed").length;
  const pending = orders.filter(o => o.status === "pending" || o.status === "in_progress").length;
  const avgDuration = completed > 0
    ? (orders.filter(o => o.status === "completed" && o.actual_duration_h).reduce((a, o) => a + o.actual_duration_h, 0) / completed).toFixed(1)
    : 0;

  const generatePDF = () => {
    setGenerating(true);
    const now = new Date().toLocaleDateString("pt-BR");

    const rows = orders.map(o => {
      const asset = assets.find(a => a.id === o.asset_id);
      const subAsset = assets.find(a => a.id === o.sub_asset_id);
      return `
        <tr>
          <td>${o.number}</td>
          <td>${o.title}</td>
          <td>${asset?.name || "-"}</td>
          <td>${subAsset?.name || "-"}</td>
          <td>${TYPE_LABEL[o.maintenance_type] || o.maintenance_type}</td>
          <td>${PRIORITY_LABEL[o.priority] || o.priority}</td>
          <td>${STATUS_LABEL[o.status] || o.status}</td>
          <td>${o.contractor_name || "-"}</td>
          <td>${o.internal_hours != null ? o.internal_hours + "h" : "-"}</td>
          <td>${o.contractor_hours != null ? o.contractor_hours + "h" : "-"}</td>
          <td>${o.scheduled_start ? new Date(o.scheduled_start).toLocaleDateString("pt-BR") : "-"}</td>
          <td>${o.actual_end ? new Date(o.actual_end).toLocaleDateString("pt-BR") : "-"}</td>
          <td>${o.observations || "-"}</td>
        </tr>
      `;
    }).join("");

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Relatorio de Ordens de Servico - SGM Ferroviario</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; padding: 20px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 2px solid #2563eb; padding-bottom: 16px; }
          .header h1 { font-size: 20px; font-weight: bold; color: #1e40af; }
          .header p { font-size: 11px; color: #64748b; margin-top: 4px; }
          .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
          .kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }
          .kpi .value { font-size: 22px; font-weight: bold; color: #1e293b; }
          .kpi .label { font-size: 10px; color: #64748b; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th { background: #1e40af; color: white; padding: 8px 6px; text-align: left; font-size: 10px; }
          td { padding: 6px; border-bottom: 1px solid #e2e8f0; font-size: 10px; vertical-align: top; }
          tr:nth-child(even) { background: #f8fafc; }
          .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>SGM Ferroviario — Gestao de Manutencao</h1>
            <p>Relatorio de Ordens de Servico</p>
            <p>Gerado em: ${now}</p>
          </div>
          <div style="text-align:right">
            <p style="font-size:12px;color:#64748b">Total de OS: <strong>${orders.length}</strong></p>
            ${statusFilter ? `<p style="font-size:11px;color:#64748b">Status: ${STATUS_LABEL[statusFilter]}</p>` : ""}
            ${typeFilter ? `<p style="font-size:11px;color:#64748b">Tipo: ${TYPE_LABEL[typeFilter]}</p>` : ""}
          </div>
        </div>

        <div class="kpis">
          <div class="kpi"><div class="value">${orders.length}</div><div class="label">Total OS</div></div>
          <div class="kpi"><div class="value">${completed}</div><div class="label">Concluidas</div></div>
          <div class="kpi"><div class="value">${pending}</div><div class="label">Em Aberto</div></div>
          <div class="kpi"><div class="value">${avgDuration}h</div><div class="label">MTTR Medio</div></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Numero</th>
              <th>Titulo</th>
              <th>Ativo</th>
              <th>Subativo</th>
              <th>Tipo</th>
              <th>Prioridade</th>
              <th>Status</th>
              <th>Terceirizada</th>
              <th>Hs Int.</th>
              <th>Hs Terc.</th>
              <th>Inicio Prev.</th>
              <th>Conclusao</th>
              <th>Observacoes</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <div class="footer">
          SGM Ferroviario — Gestao de Manutencao Ferroviaria | Relatorio gerado automaticamente em ${now}
        </div>
      </body>
      </html>
    `;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => {
        win.print();
        setGenerating(false);
      }, 500);
    } else {
      setGenerating(false);
    }
  };

  const inp = "border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Relatorios</h1>
            <p className="text-slate-500 text-sm">Exportar e visualizar dados do sistema</p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 bg-white">
              <RefreshCw size={15} className="text-slate-500" />
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-100 p-4 flex gap-3 items-center shadow-sm">
            <div className="p-2 bg-blue-50 rounded-lg"><FileText size={18} className="text-blue-600"/></div>
            <div><p className="text-2xl font-bold text-slate-800">{orders.length}</p><p className="text-xs text-slate-500">Total OS</p></div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4 flex gap-3 items-center shadow-sm">
            <div className="p-2 bg-green-50 rounded-lg"><CheckCircle size={18} className="text-green-600"/></div>
            <div><p className="text-2xl font-bold text-slate-800">{completed}</p><p className="text-xs text-slate-500">Concluidas</p></div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4 flex gap-3 items-center shadow-sm">
            <div className="p-2 bg-amber-50 rounded-lg"><Clock size={18} className="text-amber-600"/></div>
            <div><p className="text-2xl font-bold text-slate-800">{pending}</p><p className="text-xs text-slate-500">Em Aberto</p></div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4 flex gap-3 items-center shadow-sm">
            <div className="p-2 bg-indigo-50 rounded-lg"><BarChart2 size={18} className="text-indigo-600"/></div>
            <div><p className="text-2xl font-bold text-slate-800">{avgDuration}h</p><p className="text-xs text-slate-500">MTTR Medio</p></div>
          </div>
        </div>

        {/* Filtros + Exportar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={14} className="text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Filtros</span>
          </div>
          <div className="flex gap-3 flex-wrap items-end">
            <select className={inp} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Todos os status</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select className={inp} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">Todos os tipos</option>
              {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select className={inp} value={assetFilter} onChange={(e) => setAssetFilter(e.target.value)}>
              <option value="">Todos os ativos</option>
              {assets.filter(a => !a.parent_id).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <input type="date" className={inp} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              <span className="text-slate-400 text-sm">ate</span>
              <input type="date" className={inp} value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <button onClick={load} className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-sm">
              Filtrar
            </button>
            <button onClick={generatePDF} disabled={generating || orders.length === 0} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
              <Download size={14} /> {generating ? "Gerando..." : "Exportar PDF"}
            </button>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["Numero", "Titulo", "Ativo", "Subativo", "Tipo", "Prioridade", "Status", "Terceirizada", "Hs Int.", "Hs Terc.", "Inicio Prev.", "Conclusao"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={12} className="text-center py-10 text-slate-400">Carregando...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-10 text-slate-400">Nenhuma OS encontrada</td></tr>
              ) : orders.map((o) => {
                const asset = assets.find(a => a.id === o.asset_id);
                const subAsset = assets.find(a => a.id === o.sub_asset_id);
                return (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-blue-700 text-xs">{o.number}</td>
                    <td className="px-4 py-3 max-w-xs"><p className="truncate font-medium text-slate-800 text-xs">{o.title}</p></td>
                    <td className="px-4 py-3 text-xs text-slate-500">{asset?.name || "-"}</td>
                    <td className="px-4 py-3 text-xs">
                      {subAsset ? <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{subAsset.name}</span> : <span className="text-slate-300">--</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{TYPE_LABEL[o.maintenance_type] || o.maintenance_type}</td>
                    <td className="px-4 py-3"><span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", PRIORITY_BADGE[o.priority])}>{PRIORITY_LABEL[o.priority] || o.priority}</span></td>
                    <td className="px-4 py-3"><span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", STATUS_BADGE[o.status])}>{STATUS_LABEL[o.status] || o.status}</span></td>
                    <td className="px-4 py-3 text-xs text-slate-500">{o.contractor_name || "--"}</td>
                    <td className="px-4 py-3 text-xs text-center">{o.internal_hours != null ? <span className="font-semibold text-blue-700">{o.internal_hours}h</span> : "--"}</td>
                    <td className="px-4 py-3 text-xs text-center">{o.contractor_hours != null ? <span className="font-semibold text-orange-600">{o.contractor_hours}h</span> : "--"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{o.scheduled_start ? new Date(o.scheduled_start).toLocaleDateString("pt-BR") : "--"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{o.actual_end ? new Date(o.actual_end).toLocaleDateString("pt-BR") : "--"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
