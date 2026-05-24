"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import { Activity, RefreshCw, Thermometer, Zap, Gauge, Droplets, PlayCircle, ClipboardList, ChevronDown, ChevronUp, AlertTriangle, Fuel } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import clsx from "clsx";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:          { label: "Pendente",         color: "bg-slate-100 text-slate-600" },
  assigned:         { label: "Atribuída",         color: "bg-blue-100 text-blue-700" },
  in_progress:      { label: "Em Execução",       color: "bg-yellow-100 text-yellow-700" },
  paused:           { label: "Pausada",           color: "bg-orange-100 text-orange-700" },
  completed:        { label: "Concluída",         color: "bg-green-100 text-green-700" },
  cancelled:        { label: "Cancelada",         color: "bg-red-100 text-red-700" },
  waiting_parts:    { label: "Aguard. Peças",     color: "bg-purple-100 text-purple-700" },
  waiting_approval: { label: "Aguard. Aprovação", color: "bg-indigo-100 text-indigo-700" },
};

const TYPE_LABEL: Record<string, string> = {
  preventive:  "Preventiva",
  corrective:  "Corretiva",
  predictive:  "Preditiva",
  inspection:  "Inspeção",
  calibration: "Calibração",
  emergency:   "Emergência",
};

function SubAssetHistory({ subAsset }: { subAsset: any }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get("/work-orders/", { params: { asset_id: subAsset.id, limit: 10 } })
      .then((r) => setOrders(r.data))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [subAsset.id]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-2">
          <ClipboardList size={15} className="text-slate-500" />
          <span className="font-semibold text-slate-700 text-sm">{subAsset.name}</span>
          <span className="text-xs text-slate-400">{subAsset.tag}</span>
          {!loading && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">{orders.length} OS</span>}
        </div>
        {open ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
      </button>
      {open && (
        <div className="border-t border-slate-100">
          {loading && <p className="text-center text-slate-400 py-6 text-sm">Carregando...</p>}
          {!loading && orders.length === 0 && <p className="text-center text-slate-400 py-6 text-sm">Nenhuma OS encontrada para este subativo.</p>}
          {!loading && orders.length > 0 && (
            <div className="divide-y divide-slate-50">
              {orders.map((os) => {
                const st = STATUS_LABEL[os.status] ?? { label: os.status, color: "bg-slate-100 text-slate-600" };
                return (
                  <div key={os.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-slate-400">{os.number}</span>
                          <span className={clsx("px-2 py-0.5 rounded-full text-xs font-medium", st.color)}>{st.label}</span>
                          {os.maintenance_type && <span className="text-xs text-slate-500">{TYPE_LABEL[os.maintenance_type] ?? os.maintenance_type}</span>}
                        </div>
                        <p className="text-sm font-medium text-slate-700 truncate">{os.title}</p>
                        {os.observations && <p className="text-xs text-slate-500 mt-1 italic">Obs: {os.observations}</p>}
                        {os.root_cause && <p className="text-xs text-slate-500 mt-0.5">Causa raiz: {os.root_cause}</p>}
                        {os.corrective_action && <p className="text-xs text-slate-500 mt-0.5">Ação corretiva: {os.corrective_action}</p>}
                        {os.fuel_liters_added != null && (
                          <p className="text-xs text-blue-600 mt-0.5 font-medium">⛽ Abastecimento: {os.fuel_liters_added}L</p>
                        )}
                      </div>
                      <div className="text-right text-xs text-slate-400 shrink-0">
                        {os.scheduled_start && <p>{new Date(os.scheduled_start).toLocaleDateString("pt-BR")}</p>}
                        {os.actual_end && <p className="text-green-600">Concluído: {new Date(os.actual_end).toLocaleDateString("pt-BR")}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MonitoringPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [readings, setReadings] = useState<any[]>([]);
  const [latest, setLatest] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [generatingFuelOS, setGeneratingFuelOS] = useState(false);
  const [fuelOSMsg, setFuelOSMsg] = useState("");

  useEffect(() => {
    api.get("/assets/", { params: { limit: 50 } }).then((r) => {
      setAssets(r.data);
      if (r.data.length > 0) setSelected(r.data[0]);
    });
  }, []);

  const loadReadings = useCallback(() => {
    if (!selected) return;
    setLoading(true);
    api.get("/iot/readings/" + selected.id, { params: { hours: 2 } })
      .then((r) => {
        setReadings(r.data);
        const latestMap: Record<string, any> = {};
        r.data.forEach((reading: any) => {
          if (!latestMap[reading.sensor_id] || reading.timestamp > latestMap[reading.sensor_id].timestamp) {
            latestMap[reading.sensor_id] = reading;
          }
        });
        setLatest(latestMap);
      })
      .catch(() => { setReadings([]); setLatest({}); })
      .finally(() => setLoading(false));
  }, [selected]);

  useEffect(() => { loadReadings(); }, [loadReadings]);

  const simulate = async () => {
    if (!selected) return;
    setSimulating(true);
    try {
      await api.post("/iot/simulate/" + selected.id);
      setTimeout(() => loadReadings(), 500);
    } catch { } finally { setSimulating(false); }
  };

  const generateFuelOS = async () => {
    if (!selected) return;
    setGeneratingFuelOS(true);
    setFuelOSMsg("");
    try {
      const res = await api.post("/alerts/", {
        title: `Combustivel baixo — ${selected.name}`,
        description: `Nivel de combustivel abaixo de 50% (atual: ${fuelLevel}%). Necessario abastecimento urgente.`,
        asset_id: selected.id,
        severity: fuelLevel != null && fuelLevel <= 20 ? "critical" : "high",
        source: "iot",
        metric_name: "fuel_level",
        metric_value: fuelLevel,
        threshold_value: 50,
      });
      // Gera OS a partir do alerta
      const woRes = await api.post(`/alerts/${res.data.id}/create-work-order`);
      setFuelOSMsg(`OS ${woRes.data.number} gerada com sucesso!`);
      setTimeout(() => setFuelOSMsg(""), 5000);
    } catch (e: any) {
      setFuelOSMsg("Erro ao gerar OS de abastecimento.");
    } finally { setGeneratingFuelOS(false); }
  };

  const getVal = (sensorId: string) => latest[sensorId]?.value;
  const fmt = (v: any, unit: string) => v != null ? `${v}${unit}` : "--";

  const voltageData = readings.filter(r => r.sensor_id === "voltage_r").slice(-20).map(r => ({
    time: new Date(r.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    "Tensao R": r.value,
  }));

  const currentData = readings.filter(r => r.sensor_id === "current_r").slice(-20).map(r => ({
    time: new Date(r.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    "Corrente R": r.value,
  }));

  const fuelLevel = getVal("fuel_level");
  const mode = getVal("mode");
  const isSubAsset = !!selected?.parent_id;
  const fuelLow = fuelLevel != null && fuelLevel < 50;
  const subAssets = selected && !isSubAsset ? assets.filter((a) => a.parent_id === selected.id) : [];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Monitoramento</h1>
            <p className="text-slate-500 text-sm">Telemetria em tempo real</p>
          </div>
          <div className="flex gap-2">
            <button onClick={simulate} disabled={simulating || !selected || isSubAsset} className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm">
              <PlayCircle size={15} />{simulating ? "Simulando..." : "Simular Dados"}
            </button>
            <button onClick={loadReadings} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 bg-white">
              <RefreshCw size={15} className="text-slate-500" />
            </button>
          </div>
        </div>

        {/* Banner alerta combustivel baixo */}
        {fuelLow && !isSubAsset && (
          <div className={clsx(
            "rounded-xl border p-4 mb-4 flex items-start justify-between gap-4",
            fuelLevel <= 20 ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"
          )}>
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className={fuelLevel <= 20 ? "text-red-600 mt-0.5 shrink-0" : "text-amber-600 mt-0.5 shrink-0"} />
              <div>
                <p className={clsx("font-semibold text-sm", fuelLevel <= 20 ? "text-red-800" : "text-amber-800")}>
                  {fuelLevel <= 20 ? "⚠️ Combustivel Critico!" : "⚠️ Combustivel Baixo"}
                </p>
                <p className={clsx("text-xs mt-0.5", fuelLevel <= 20 ? "text-red-600" : "text-amber-600")}>
                  Nivel atual: <strong>{fuelLevel}%</strong> — abaixo de 50%. É necessário gerar uma OS de abastecimento.
                </p>
                {fuelOSMsg && (
                  <p className={clsx("text-xs mt-1 font-medium", fuelOSMsg.includes("Erro") ? "text-red-700" : "text-green-700")}>
                    {fuelOSMsg}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={generateFuelOS}
              disabled={generatingFuelOS}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white whitespace-nowrap disabled:opacity-50",
                fuelLevel <= 20 ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"
              )}
            >
              <Fuel size={14} />
              {generatingFuelOS ? "Gerando..." : "Gerar OS Abastecimento"}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="font-semibold text-slate-700 mb-3 text-sm">Ativos</h2>
            <div className="space-y-1">
              {assets.map((a) => (
                <button key={a.id} onClick={() => setSelected(a)}
                  className={clsx("w-full text-left px-3 py-2 rounded-lg text-sm transition-colors", a.parent_id ? "pl-6" : "", selected?.id === a.id ? "bg-blue-600 text-white" : "hover:bg-slate-50 text-slate-700")}>
                  <p className="font-medium truncate">{a.parent_id ? "↳ " : ""}{a.name}</p>
                  <p className={clsx("text-xs", selected?.id === a.id ? "text-blue-200" : "text-slate-400")}>{a.tag}</p>
                </button>
              ))}
              {assets.length === 0 && <p className="text-slate-400 text-xs text-center py-4">Nenhum ativo cadastrado</p>}
            </div>
          </div>

          <div className="lg:col-span-3 space-y-4">
            {selected && (
              <>
                <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-slate-700">{selected.name}</h2>
                    <p className="text-xs text-slate-500">Tag: {selected.tag} | Tipo: {selected.asset_type}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {!isSubAsset && (
                      <span className={clsx("px-3 py-1 rounded-full text-xs font-medium", mode === 1 ? "bg-blue-100 text-blue-700" : mode === 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500")}>
                        {mode === 1 ? "Automatico" : mode === 0 ? "Manual" : "-- Modo"}
                      </span>
                    )}
                    <span className={clsx("px-3 py-1 rounded-full text-xs font-medium", selected.status === "operational" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
                      {selected.status === "operational" ? "Operacional" : selected.status}
                    </span>
                  </div>
                </div>

                {!isSubAsset ? (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Tensao R", sensor: "voltage_r", unit: "V", icon: <Zap size={18} className="text-blue-600"/>, bg: "bg-blue-50" },
                        { label: "Tensao S", sensor: "voltage_s", unit: "V", icon: <Zap size={18} className="text-indigo-600"/>, bg: "bg-indigo-50" },
                        { label: "Tensao T", sensor: "voltage_t", unit: "V", icon: <Zap size={18} className="text-violet-600"/>, bg: "bg-violet-50" },
                        { label: "Corrente R", sensor: "current_r", unit: "A", icon: <Gauge size={18} className="text-green-600"/>, bg: "bg-green-50" },
                        { label: "Corrente S", sensor: "current_s", unit: "A", icon: <Gauge size={18} className="text-emerald-600"/>, bg: "bg-emerald-50" },
                        { label: "Corrente T", sensor: "current_t", unit: "A", icon: <Gauge size={18} className="text-teal-600"/>, bg: "bg-teal-50" },
                      ].map(item => (
                        <div key={item.sensor} className="bg-white rounded-xl border border-slate-200 p-4 flex gap-3 items-center">
                          <div className={clsx("p-2 rounded-lg", item.bg)}>{item.icon}</div>
                          <div>
                            <p className="text-xl font-bold text-slate-800">{fmt(getVal(item.sensor), item.unit)}</p>
                            <p className="text-xs text-slate-500">{item.label}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white rounded-xl border border-slate-200 p-4 flex gap-3 items-center">
                        <div className="p-2 bg-amber-50 rounded-lg"><Thermometer size={18} className="text-amber-600"/></div>
                        <div>
                          <p className="text-xl font-bold text-slate-800">{fmt(getVal("temperature"), "°C")}</p>
                          <p className="text-xs text-slate-500">Temperatura</p>
                        </div>
                      </div>
                      <div className={clsx("rounded-xl border p-4", fuelLow ? (fuelLevel <= 20 ? "border-red-300 bg-red-50" : "border-amber-300 bg-amber-50") : "border-slate-200 bg-white")}>
                        <div className="flex items-center gap-2 mb-2">
                          <Droplets size={18} className={fuelLow ? (fuelLevel <= 20 ? "text-red-500" : "text-amber-500") : "text-blue-500"}/>
                          <p className="text-xs text-slate-500">Nivel Combustivel</p>
                          <span className={clsx("ml-auto font-bold", fuelLow ? (fuelLevel <= 20 ? "text-red-700" : "text-amber-700") : "text-slate-800")}>{fmt(fuelLevel, "%")}</span>
                          {fuelLow && <AlertTriangle size={14} className={fuelLevel <= 20 ? "text-red-500" : "text-amber-500"} />}
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3">
                          <div className={clsx("h-3 rounded-full transition-all", fuelLevel > 50 ? "bg-green-500" : fuelLevel > 20 ? "bg-amber-500" : "bg-red-500")} style={{ width: fuelLevel != null ? fuelLevel + "%" : "0%" }} />
                        </div>
                        {fuelLow && <p className={clsx("text-xs mt-1 font-medium", fuelLevel <= 20 ? "text-red-600" : "text-amber-600")}>Abastecimento necessario!</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <h2 className="font-semibold text-slate-700 mb-3 flex items-center gap-2 text-sm"><Activity size={14}/> Historico Tensao R (V)</h2>
                        {voltageData.length === 0 ? <p className="text-center text-slate-400 py-8 text-sm">Sem dados</p> : (
                          <ResponsiveContainer width="100%" height={150}>
                            <LineChart data={voltageData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="time" tick={{ fontSize: 9 }} />
                              <YAxis tick={{ fontSize: 9 }} domain={[180, 250]} />
                              <Tooltip />
                              <Line type="monotone" dataKey="Tensao R" stroke="#2563EB" dot={false} strokeWidth={2} />
                            </LineChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                      <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <h2 className="font-semibold text-slate-700 mb-3 flex items-center gap-2 text-sm"><Activity size={14}/> Historico Corrente R (A)</h2>
                        {currentData.length === 0 ? <p className="text-center text-slate-400 py-8 text-sm">Sem dados</p> : (
                          <ResponsiveContainer width="100%" height={150}>
                            <LineChart data={currentData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="time" tick={{ fontSize: 9 }} />
                              <YAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
                              <Tooltip />
                              <Line type="monotone" dataKey="Corrente R" stroke="#16A34A" dot={false} strokeWidth={2} />
                            </LineChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>

                    {subAssets.length > 0 && (
                      <div className="space-y-3">
                        <h2 className="font-semibold text-slate-700 flex items-center gap-2 text-sm">
                          <ClipboardList size={15} className="text-slate-500" /> Histórico de Subativos
                        </h2>
                        {subAssets.map((sub) => <SubAssetHistory key={sub.id} subAsset={sub} />)}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
                    <p className="text-slate-400 text-sm">Subativo selecionado — telemetria disponível apenas no ativo principal.</p>
                  </div>
                )}
              </>
            )}
            {!selected && <p className="text-center text-slate-400 py-20">Selecione um ativo para ver o monitoramento</p>}
          </div>
        </div>
      </main>
    </div>
  );
}
