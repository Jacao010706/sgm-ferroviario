"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import { Activity, RefreshCw, Thermometer, Zap, Gauge, Droplets, PlayCircle } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import clsx from "clsx";

export default function MonitoringPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [readings, setReadings] = useState<any[]>([]);
  const [latest, setLatest] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    api.get("/assets", { params: { limit: 50 } }).then((r) => {
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
    } catch { }
    finally { setSimulating(false); }
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
            <button onClick={simulate} disabled={simulating || !selected} className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm">
              <PlayCircle size={15} />{simulating ? "Simulando..." : "Simular Dados"}
            </button>
            <button onClick={loadReadings} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 bg-white">
              <RefreshCw size={15} className="text-slate-500" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="font-semibold text-slate-700 mb-3 text-sm">Ativos</h2>
            <div className="space-y-1">
              {assets.map((a) => (
                <button key={a.id} onClick={() => setSelected(a)} className={clsx("w-full text-left px-3 py-2 rounded-lg text-sm transition-colors", selected?.id === a.id ? "bg-blue-600 text-white" : "hover:bg-slate-50 text-slate-700")}>
                  <p className="font-medium truncate">{a.name}</p>
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
                    <span className={clsx("px-3 py-1 rounded-full text-xs font-medium", mode === 1 ? "bg-blue-100 text-blue-700" : mode === 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500")}>
                      {mode === 1 ? "Automatico" : mode === 0 ? "Manual" : "-- Modo"}
                    </span>
                    <span className={clsx("px-3 py-1 rounded-full text-xs font-medium", selected.status === "operational" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
                      {selected.status === "operational" ? "Operacional" : selected.status}
                    </span>
                  </div>
                </div>

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
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Droplets size={18} className="text-blue-500"/>
                      <p className="text-xs text-slate-500">Nivel Combustivel</p>
                      <span className="ml-auto font-bold text-slate-800">{fmt(fuelLevel, "%")}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3">
                      <div className={clsx("h-3 rounded-full transition-all", fuelLevel > 50 ? "bg-green-500" : fuelLevel > 20 ? "bg-amber-500" : "bg-red-500")} style={{ width: fuelLevel != null ? fuelLevel + "%" : "0%" }} />
                    </div>
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
              </>
            )}
            {!selected && <p className="text-center text-slate-400 py-20">Selecione um ativo para ver o monitoramento</p>}
          </div>
        </div>
      </main>
    </div>
  );
}