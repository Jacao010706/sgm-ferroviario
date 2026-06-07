"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import { ArrowLeft, Wrench, Calendar, Zap, Gauge, Thermometer, Droplets, Activity, RefreshCw } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import clsx from "clsx";

const STATUS_BADGE: Record<string, string> = { operational: "bg-green-100 text-green-700", maintenance: "bg-amber-100 text-amber-700", failure: "bg-red-100 text-red-700", standby: "bg-slate-100 text-slate-600", decommissioned: "bg-gray-100 text-gray-400" };
const STATUS_LABEL: Record<string, string> = { operational: "Operacional", maintenance: "Manutencao", failure: "Falha", standby: "Reserva", decommissioned: "Desativado" };
const TYPE_LABEL: Record<string, string> = { substation: "Subestacao", generator: "Gerador", transformer: "Transformador", rectifier: "Retificador", inverter: "Inversor", switchgear: "Painel", catenary: "Catenaria", battery_bank: "Banco Baterias", circuit_breaker: "Disjuntor", measurement: "Medicao", cooling: "Refrigeracao", other: "Outro" };

const TELEMETRY_ASSETS = ["generator"];

export default function AssetDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [asset, setAsset] = useState<any>(null);
  const [kids, setKids] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [readings, setReadings] = useState<any[]>([]);
  const [latest, setLatest] = useState<Record<string, any>>({});
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get(`/assets/${id}`),
      api.get("/assets/", { params: { limit: 200 } }),
      api.get("/work-orders/", { params: { asset_id: id, limit: 20 } }),
    ]).then(([assetRes, allRes, woRes]) => {
      setAsset(assetRes.data);
      setKids(allRes.data.filter((a: any) => a.parent_id === id));
      setWorkOrders(woRes.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const loadTelemetry = useCallback(() => {
    if (!id) return;
    setLoadingTelemetry(true);
    api.get("/iot/readings/" + id, { params: { hours: 2 } })
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
      .finally(() => setLoadingTelemetry(false));
  }, [id]);

  useEffect(() => {
    if (asset && TELEMETRY_ASSETS.includes(asset.asset_type)) {
      loadTelemetry();
    }
  }, [asset, loadTelemetry]);

  const getVal = (sensorId: string) => latest[sensorId]?.value;
  const fmt = (v: any, unit: string) => v != null ? `${v}${unit}` : "--";
  const fuelLevel = getVal("fuel_level");

  const voltageData = readings.filter(r => r.sensor_id === "voltage_r").slice(-20).map(r => ({
    time: new Date(r.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    "Tensao R": r.value,
  }));

  const currentData = readings.filter(r => r.sensor_id === "current_r").slice(-20).map(r => ({
    time: new Date(r.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    "Corrente R": r.value,
  }));

  if (loading) return <div className="flex min-h-screen bg-slate-50"><Sidebar /><main className="flex-1 p-6 flex items-center justify-center text-slate-400">Carregando...</main></div>;
  if (!asset) return <div className="flex min-h-screen bg-slate-50"><Sidebar /><main className="flex-1 p-6 flex items-center justify-center text-slate-400">Ativo nao encontrado</main></div>;

  const showTelemetry = TELEMETRY_ASSETS.includes(asset.asset_type);

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

        {/* Telemetria — geradores e ativos elétricos */}
        {showTelemetry && (
          <div className="mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-700 flex items-center gap-2">
                <Activity size={16} className="text-blue-600" />
                Telemetria em Tempo Real
              </h2>
              <button onClick={loadTelemetry} disabled={loadingTelemetry} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 bg-white">
                <RefreshCw size={14} className={clsx("text-slate-500", loadingTelemetry && "animate-spin")} />
              </button>
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

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl border border-slate-200 p-4 flex gap-3 items-center">
                <div className="p-2 bg-amber-50 rounded-lg"><Thermometer size={18} className="text-amber-600"/></div>
                <div>
                  <p className="text-xl font-bold text-slate-800">{fmt(getVal("temperature"), "°C")}</p>
                  <p className="text-xs text-slate-500">Temperatura</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 flex gap-3 items-center">
                <div className="p-2 bg-yellow-50 rounded-lg"><Zap size={18} className="text-yellow-600"/></div>
                <div>
                  <p className="text-xl font-bold text-slate-800">{(() => { const v = latest["battery"]?.value ?? latest["runtime_hours"]?.value; return v != null ? (v < 20 ? v.toFixed(1) : (v/10).toFixed(1)) + "V" : "--"; })()}</p>
                  <p className="text-xs text-slate-500">Bateria</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Droplets size={18} className="text-blue-500"/>
                  <p className="text-xs text-slate-500">Nivel Combustivel</p>
                  <span className="ml-auto font-bold text-slate-800">{fmt(fuelLevel, "%")}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3">
                  <div className={clsx("h-3 rounded-full transition-all", fuelLevel > 50 ? "bg-green-500" : fuelLevel > 20 ? "bg-amber-500" : "bg-red-500")}
                    style={{ width: fuelLevel != null ? fuelLevel + "%" : "0%" }} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2 text-sm"><Activity size={14}/> Historico Tensao R (V)</h3>
                {voltageData.length === 0 ? <p className="text-center text-slate-400 py-8 text-sm">Sem dados — clique em Simular no Monitoramento</p> : (
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
                <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2 text-sm"><Activity size={14}/> Historico Corrente R (A)</h3>
                {currentData.length === 0 ? <p className="text-center text-slate-400 py-8 text-sm">Sem dados — clique em Simular no Monitoramento</p> : (
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
          </div>
        )}

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
