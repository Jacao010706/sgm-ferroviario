"use client";
import { useEffect, useState, useRef } from "react";
import { api, createTelemetrySocket } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import { Zap, Thermometer, Activity, Gauge, Battery, Droplets } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine,
} from "recharts";

type Reading = { timestamp: string; value: number };
type LiveData = Record<string, { value: number; unit: string; timestamp: string }>;

const SENSOR_ICONS: Record<string, React.ReactNode> = {
  voltage: <Zap size={16} className="text-yellow-500" />,
  temperature: <Thermometer size={16} className="text-red-500" />,
  oil_temp: <Thermometer size={16} className="text-orange-500" />,
  current: <Activity size={16} className="text-blue-500" />,
  power: <Gauge size={16} className="text-purple-500" />,
  fuel_level: <Droplets size={16} className="text-green-500" />,
  battery_voltage: <Battery size={16} className="text-cyan-500" />,
};

export default function MonitoringPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [liveData, setLiveData] = useState<LiveData>({});
  const [history, setHistory] = useState<Record<string, Reading[]>>({});
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    api.get("/assets", { params: { limit: 100 } }).then((r) => {
      setAssets(r.data);
      if (r.data.length > 0) setSelectedAsset(r.data[0]);
    });
  }, []);

  useEffect(() => {
    if (!selectedAsset) return;

    // Carregar histórico das últimas 2h
    api.get(`/iot/readings/${selectedAsset.id}`, { params: { hours: 2 } }).then((r) => {
      const grouped: Record<string, Reading[]> = {};
      for (const rd of r.data) {
        if (!grouped[rd.type]) grouped[rd.type] = [];
        grouped[rd.type].push({ timestamp: rd.timestamp, value: rd.value });
      }
      setHistory(grouped);
    });

    // WebSocket para dados em tempo real
    wsRef.current?.close();
    const ws = createTelemetrySocket(selectedAsset.id, (data: any) => {
      setLiveData((prev) => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(data)) {
          if (k !== "timestamp" && typeof v === "number") {
            next[k] = { value: v as number, unit: "", timestamp: data.timestamp || new Date().toISOString() };
          }
        }
        return next;
      });
      setHistory((prev) => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(data)) {
          if (k !== "timestamp" && typeof v === "number") {
            if (!next[k]) next[k] = [];
            next[k] = [...next[k].slice(-60), { timestamp: data.timestamp, value: v as number }];
          }
        }
        return next;
      });
    });
    wsRef.current = ws;

    return () => { ws.close(); };
  }, [selectedAsset]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
          <h1 className="text-xl font-bold text-slate-800">Monitoramento em Tempo Real</h1>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-slate-500">Ao vivo</span>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Lista de ativos */}
          <div className="w-56 bg-white border-r border-slate-200 overflow-y-auto">
            <p className="px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Ativos</p>
            {assets.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedAsset(a)}
                className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-blue-50 transition-colors ${
                  selectedAsset?.id === a.id ? "bg-blue-50 border-l-4 border-l-blue-600" : ""
                }`}
              >
                <p className="font-semibold text-sm text-slate-800 truncate">{a.tag}</p>
                <p className="text-xs text-slate-500 truncate">{a.name}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded mt-1 inline-block ${
                  a.status === "operational" ? "bg-green-100 text-green-700" :
                  a.status === "failure" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                }`}>{a.status}</span>
              </button>
            ))}
          </div>

          {/* Painel de telemetria */}
          <div className="flex-1 p-6 overflow-y-auto bg-slate-50">
            {selectedAsset ? (
              <>
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-slate-800">{selectedAsset.name}</h2>
                  <p className="text-sm text-slate-500">{selectedAsset.tag} — {selectedAsset.asset_type}</p>
                </div>

                {/* Cards de leitura atual */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                  {Object.entries(liveData).map(([key, data]) => (
                    <div key={key} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                      <div className="flex items-center gap-2 mb-1">
                        {SENSOR_ICONS[key] || <Activity size={16} />}
                        <span className="text-xs text-slate-500 capitalize">{key.replace(/_/g, " ")}</span>
                      </div>
                      <p className="text-2xl font-bold text-slate-800">
                        {typeof data.value === "number" ? data.value.toFixed(2) : "—"}
                        <span className="text-sm font-normal text-slate-400 ml-1">{data.unit}</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-1">{new Date(data.timestamp).toLocaleTimeString("pt-BR")}</p>
                    </div>
                  ))}
                </div>

                {/* Gráficos histórico */}
                {Object.entries(history).map(([key, readings]) => (
                  <div key={key} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 mb-4">
                    <h3 className="font-semibold text-slate-700 mb-3 capitalize flex items-center gap-2">
                      {SENSOR_ICONS[key]} {key.replace(/_/g, " ")}
                    </h3>
                    <ResponsiveContainer width="100%" height={120}>
                      <LineChart data={readings}>
                        <XAxis
                          dataKey="timestamp"
                          tick={{ fontSize: 10 }}
                          tickFormatter={(t) => new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                          formatter={(v: number) => [v.toFixed(3), key]}
                          labelFormatter={(l) => new Date(l).toLocaleTimeString("pt-BR")}
                        />
                        <Line type="monotone" dataKey="value" stroke="#2563EB" dot={false} strokeWidth={1.5} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ))}

                {Object.keys(history).length === 0 && Object.keys(liveData).length === 0 && (
                  <div className="text-center py-16 text-slate-400">
                    <Activity size={40} className="mx-auto mb-3 opacity-30" />
                    <p>Aguardando dados de telemetria...</p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                Selecione um ativo para monitorar
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
