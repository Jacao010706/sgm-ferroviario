"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import { Activity, RefreshCw, Thermometer, Zap, Gauge } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function MonitoringPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [readings, setReadings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/assets", { params: { limit: 50 } }).then((r) => {
      setAssets(r.data);
      if (r.data.length > 0) setSelected(r.data[0]);
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    api.get(`/iot/readings/${selected.id}`, { params: { limit: 20 } })
      .then((r) => setReadings(r.data))
      .catch(() => setReadings([]))
      .finally(() => setLoading(false));
  }, [selected]);

  const latest = readings[0];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Monitoramento</h1>
            <p className="text-slate-500 text-sm">Telemetria em tempo real</p>
          </div>
          <button onClick={() => setSelected({...selected})} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 bg-white">
            <RefreshCw size={15} className="text-slate-500" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="font-semibold text-slate-700 mb-3 text-sm">Ativos</h2>
            <div className="space-y-1">
              {assets.map((a) => (
                <button key={a.id} onClick={() => setSelected(a)} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selected?.id === a.id ? "bg-blue-600 text-white" : "hover:bg-slate-50 text-slate-700"}`}>
                  <p className="font-medium truncate">{a.name}</p>
                  <p className={`text-xs ${selected?.id === a.id ? "text-blue-200" : "text-slate-400"}`}>{a.tag}</p>
                </button>
              ))}
              {assets.length === 0 && <p className="text-slate-400 text-xs text-center py-4">Nenhum ativo cadastrado</p>}
            </div>
          </div>

          <div className="lg:col-span-3 space-y-4">
            {selected && (
              <>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="font-semibold text-slate-700">{selected.name}</h2>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selected.status === "operational" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{selected.status}</span>
                  </div>
                  <p className="text-xs text-slate-500">Tag: {selected.tag} | Tipo: {selected.asset_type}</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-4 flex gap-3 items-center">
                    <div className="p-2 bg-blue-50 rounded-lg"><Zap size={20} className="text-blue-600" /></div>
                    <div>
                      <p className="text-xl font-bold text-slate-800">{latest?.voltage_v ? `${latest.voltage_v}V` : "--"}</p>
                      <p className="text-xs text-slate-500">Tensao</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4 flex gap-3 items-center">
                    <div className="p-2 bg-amber-50 rounded-lg"><Thermometer size={20} className="text-amber-600" /></div>
                    <div>
                      <p className="text-xl font-bold text-slate-800">{latest?.temperature_c ? `${latest.temperature_c}C` : "--"}</p>
                      <p className="text-xs text-slate-500">Temperatura</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4 flex gap-3 items-center">
                    <div className="p-2 bg-green-50 rounded-lg"><Gauge size={20} className="text-green-600" /></div>
                    <div>
                      <p className="text-xl font-bold text-slate-800">{latest?.current_a ? `${latest.current_a}A` : "--"}</p>
                      <p className="text-xs text-slate-500">Corrente</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <h2 className="font-semibold text-slate-700 mb-4 flex items-center gap-2"><Activity size={16} /> Historico de Leituras</h2>
                  {loading ? <p className="text-center text-slate-400 py-8">Carregando...</p>
                  : readings.length === 0 ? <p className="text-center text-slate-400 py-8">Nenhuma leitura disponivel para este ativo</p>
                  : (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={[...readings].reverse()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} tickFormatter={(v) => new Date(v).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="voltage_v" stroke="#2563EB" name="Tensao (V)" dot={false} />
                        <Line type="monotone" dataKey="temperature_c" stroke="#D97706" name="Temp (C)" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
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