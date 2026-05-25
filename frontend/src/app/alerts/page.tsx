"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import { AlertTriangle, RefreshCw, CheckCircle, Wrench, Plus, X, Bell } from "lucide-react";
import clsx from "clsx";

const SEVERITY_BADGE: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high:     "bg-orange-100 text-orange-700 border-orange-200",
  medium:   "bg-amber-100 text-amber-700 border-amber-200",
  low:      "bg-green-100 text-green-700 border-green-200",
  info:     "bg-blue-100 text-blue-700 border-blue-200",
};

const SEVERITY_LABEL: Record<string, string> = {
  critical: "Critico",
  high:     "Alto",
  medium:   "Medio",
  low:      "Baixo",
  info:     "Info",
};

const STATUS_LABEL: Record<string, string> = {
  active:       "Ativo",
  acknowledged: "Reconhecido",
  in_treatment: "Em Tratamento",
  resolved:     "Resolvido",
  suppressed:   "Suprimido",
};

const SOURCE_LABEL: Record<string, string> = {
  scada:      "SCADA",
  iot_sensor: "Sensor IoT",
  predictive: "Preditivo",
  manual:     "Manual",
  erp:        "ERP",
};

const emptyForm = {
  title: "",
  description: "",
  asset_id: "",
  severity: "medium",
  source: "manual",
  metric_name: "",
  metric_value: "",
  threshold_value: "",
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("active");
  const [severityFilter, setSeverityFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<any>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get("/alerts", { params: { status: statusFilter || undefined, severity: severityFilter || undefined, limit: 100 } })
        .then((r) => setAlerts(r.data)),
      api.get("/assets", { params: { limit: 100 } }).then((r) => setAssets(r.data)),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter, severityFilter]);

  const acknowledge = async (id: string) => {
    await api.post(`/alerts/${id}/acknowledge`).catch(() => {});
    load();
  };

  const resolve = async (id: string) => {
    await api.post(`/alerts/${id}/resolve`).catch(() => {});
    load();
  };

  const createWO = async (id: string) => {
    await api.post(`/alerts/${id}/create-work-order`).catch(() => {});
    load();
  };

  const handleSubmit = async () => {
    if (!form.title || !form.asset_id || !form.severity) {
      setError("Preencha titulo, ativo e severidade");
      return;
    }
    setSaving(true); setError("");
    try {
      const payload: any = { ...form };
      if (payload.metric_value) payload.metric_value = parseFloat(payload.metric_value);
      if (payload.threshold_value) payload.threshold_value = parseFloat(payload.threshold_value);
      if (!payload.metric_name) delete payload.metric_name;
      if (!payload.metric_value) delete payload.metric_value;
      if (!payload.threshold_value) delete payload.threshold_value;
      if (!payload.description) delete payload.description;
      await api.post("/alerts/", payload);
      setShowModal(false);
      setForm({ ...emptyForm });
      load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Erro ao criar alerta");
    } finally {
      setSaving(false);
    }
  };

  const countBySeverity = (sev: string) => alerts.filter(a => a.severity === sev).length;

  const inp = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const lbl = "block text-sm font-medium text-slate-700 mb-1";

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Alertas</h1>
            <p className="text-slate-500 text-sm">{alerts.length} registros</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <Plus size={15} /> Novo Alerta
            </button>
            <button onClick={load} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 bg-white">
              <RefreshCw size={15} className="text-slate-500" />
            </button>
          </div>
        </div>

        {/* Resumo por severidade */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          {["critical", "high", "medium", "low", "info"].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(severityFilter === sev ? "" : sev)}
              className={clsx(
                "bg-white rounded-xl border p-3 text-center transition-all",
                severityFilter === sev ? "ring-2 ring-blue-500" : "border-slate-200 hover:border-slate-300"
              )}
            >
              <p className="text-xl font-bold text-slate-800">{countBySeverity(sev)}</p>
              <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium border", SEVERITY_BADGE[sev])}>
                {SEVERITY_LABEL[sev]}
              </span>
            </button>
          ))}
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 flex gap-3 flex-wrap">
          <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos os status</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
            <option value="">Todas as severidades</option>
            {Object.entries(SEVERITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {/* Lista de alertas */}
        <div className="space-y-3">
          {loading ? (
            <p className="text-center text-slate-400 py-10">Carregando...</p>
          ) : alerts.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Bell size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400">Nenhum alerta encontrado</p>
            </div>
          ) : alerts.map((a) => (
            <div key={a.id} className={clsx("bg-white rounded-xl border p-4 flex gap-4 items-start shadow-sm", SEVERITY_BADGE[a.severity])}>
              <AlertTriangle size={20} className="mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-sm">{a.title}</span>
                  <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium border", SEVERITY_BADGE[a.severity])}>
                    {SEVERITY_LABEL[a.severity] || a.severity}
                  </span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {STATUS_LABEL[a.status] || a.status}
                  </span>
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                    {SOURCE_LABEL[a.source] || a.source}
                  </span>
                </div>
                {a.description && <p className="text-xs opacity-80 mb-1">{a.description}</p>}
                {a.parameter && (
                  <p className="text-xs opacity-70 mb-1">
                    Parametro: <strong>{a.parameter}</strong> = {a.value} {a.unit} (limite: {a.threshold} {a.unit})
                  </p>
                )}
                {a.metric_name && (
                  <p className="text-xs opacity-70 mb-1">
                    Metrica: <strong>{a.metric_name}</strong> = {a.metric_value} (threshold: {a.threshold_value})
                  </p>
                )}
                <p className="text-xs opacity-60">
                  {new Date(a.triggered_at).toLocaleString("pt-BR")} — {assets.find(x => x.id === a.asset_id)?.name || "Ativo"}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                {a.status === "active" && (
                  <>
                    <button onClick={() => acknowledge(a.id)} className="flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
                      <CheckCircle size={12} /> Reconhecer
                    </button>
                    <button onClick={() => createWO(a.id)} className="flex items-center gap-1 text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600">
                      <Wrench size={12} /> Abrir OS
                    </button>
                  </>
                )}
                {a.status === "acknowledged" && (
                  <button onClick={() => resolve(a.id)} className="flex items-center gap-1 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700">
                    <CheckCircle size={12} /> Resolver
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Modal novo alerta */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-800">Novo Alerta</h2>
                <button onClick={() => { setShowModal(false); setError(""); setForm({ ...emptyForm }); }} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div><label className={lbl}>Titulo *</label><input className={inp} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Temperatura acima do limite" /></div>
                <div><label className={lbl}>Descricao</label><textarea className={inp} rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Descricao detalhada..." /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>Ativo *</label>
                    <select className={inp} value={form.asset_id} onChange={e => setForm({ ...form, asset_id: e.target.value })}>
                      <option value="">Selecione um ativo</option>
                      {assets.filter(a => !a.parent_id).map(a => <option key={a.id} value={a.id}>{a.name} ({a.tag})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Severidade *</label>
                    <select className={inp} value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}>
                      {Object.entries(SEVERITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Threshold (opcional)</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className={lbl}>Parametro</label><input className={inp} value={form.metric_name} onChange={e => setForm({ ...form, metric_name: e.target.value })} placeholder="Ex: temperature" /></div>
                    <div><label className={lbl}>Valor medido</label><input type="number" className={inp} value={form.metric_value} onChange={e => setForm({ ...form, metric_value: e.target.value })} placeholder="Ex: 85.5" /></div>
                    <div><label className={lbl}>Limite</label><input type="number" className={inp} value={form.threshold_value} onChange={e => setForm({ ...form, threshold_value: e.target.value })} placeholder="Ex: 80" /></div>
                  </div>
                </div>
                {error && <p className="text-red-600 text-sm">{error}</p>}
              </div>
              <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
                <button onClick={() => { setShowModal(false); setError(""); setForm({ ...emptyForm }); }} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
                <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">{saving ? "Salvando..." : "Criar Alerta"}</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

