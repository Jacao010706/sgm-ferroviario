"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type DataPoint = {
  sensor_id: string;
  reading_type: "temperature" | "fuel_level";
  value: number;
  unit: string | null;
  timestamp: string;
};

// Formata timestamp UTC para hora local br
function fmtTime(iso: string) {
  const d = new Date(iso.endsWith("Z") ? iso : iso + "Z");
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(iso: string) {
  const d = new Date(iso.endsWith("Z") ? iso : iso + "Z");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

// Renderiza gráfico SVG simples
function LineChart({
  data,
  label,
  unit,
  color,
  yMin,
  yMax,
}: {
  data: { x: number; y: number; label: string }[];
  label: string;
  unit: string;
  color: string;
  yMin: number;
  yMax: number;
}) {
  if (data.length < 2) {
    return (
      <div style={{ color: "#666", textAlign: "center", padding: 40 }}>
        Sem dados suficientes para exibir o gráfico.
      </div>
    );
  }

  const W = 700;
  const H = 180;
  const PAD = { top: 20, right: 20, bottom: 36, left: 48 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const xMin = data[0].x;
  const xMax = data[data.length - 1].x;
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;

  const toX = (x: number) => PAD.left + ((x - xMin) / xRange) * chartW;
  const toY = (y: number) => PAD.top + chartH - ((y - yMin) / yRange) * chartH;

  const points = data.map((d) => `${toX(d.x).toFixed(1)},${toY(d.y).toFixed(1)}`).join(" ");

  // Ticks do eixo Y (5 divisões)
  const yTicks = Array.from({ length: 5 }, (_, i) => yMin + (yRange / 4) * i);

  // Ticks do eixo X — até 6 labels
  const step = Math.max(1, Math.floor(data.length / 6));
  const xTicks = data.filter((_, i) => i % step === 0 || i === data.length - 1);

  return (
    <div>
      <div style={{ color, fontSize: 12, marginBottom: 4, fontWeight: "bold" }}>
        {label} ({unit})
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W, display: "block" }}>
        {/* Grid horizontal */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line
              x1={PAD.left} y1={toY(v)} x2={W - PAD.right} y2={toY(v)}
              stroke="#1a2a1a" strokeWidth="1"
            />
            <text x={PAD.left - 6} y={toY(v) + 4} textAnchor="end" fill="#666" fontSize="10">
              {v.toFixed(0)}
            </text>
          </g>
        ))}

        {/* Eixos */}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke="#333" strokeWidth="1" />
        <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="#333" strokeWidth="1" />

        {/* Linha do gráfico */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Área preenchida */}
        <polygon
          points={`${toX(data[0].x).toFixed(1)},${H - PAD.bottom} ${points} ${toX(data[data.length - 1].x).toFixed(1)},${H - PAD.bottom}`}
          fill={color}
          fillOpacity="0.08"
        />

        {/* Labels X */}
        {xTicks.map((d, i) => (
          <g key={i}>
            <text
              x={toX(d.x)} y={H - PAD.bottom + 14}
              textAnchor="middle" fill="#555" fontSize="9">
              {fmtTime(d.label)}
            </text>
            <text
              x={toX(d.x)} y={H - PAD.bottom + 25}
              textAnchor="middle" fill="#444" fontSize="8">
              {fmtDate(d.label)}
            </text>
          </g>
        ))}

        {/* Último valor */}
        {data.length > 0 && (
          <text
            x={toX(data[data.length - 1].x) + 4}
            y={toY(data[data.length - 1].y) - 4}
            fill={color}
            fontSize="11"
            fontWeight="bold">
            {data[data.length - 1].y.toFixed(1)}
          </text>
        )}
      </svg>
    </div>
  );
}

export default function HistoricoPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [pontos, setPontos] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [assetName, setAssetName] = useState<string>("");
  const [horas, setHoras] = useState(24);

  useEffect(() => {
    // Busca nome do asset
    api.get(`/assets/${id}`).then((r) => {
      setAssetName(r.data?.name || r.data?.tag || id);
    }).catch(() => {});
  }, [id]);

  useEffect(() => {
    setLoading(true);
    setErro(null);
    api
      .get(`/generators/${id}/history`, { params: { hours: horas } })
      .then((r) => setPontos(r.data || []))
      .catch((e: any) => setErro(e?.response?.data?.detail || "Erro ao carregar histórico."))
      .finally(() => setLoading(false));
  }, [id, horas]);

  // Separa por tipo e converte timestamps para ms
  const tempData = pontos
    .filter((p) => p.reading_type === "temperature")
    .map((p) => ({ x: new Date(p.timestamp.endsWith("Z") ? p.timestamp : p.timestamp + "Z").getTime(), y: p.value, label: p.timestamp }));

  const fuelData = pontos
    .filter((p) => p.reading_type === "fuel_level")
    .map((p) => ({ x: new Date(p.timestamp.endsWith("Z") ? p.timestamp : p.timestamp + "Z").getTime(), y: p.value, label: p.timestamp }));

  const lastTemp = tempData.length ? tempData[tempData.length - 1].y : null;
  const lastFuel = fuelData.length ? fuelData[fuelData.length - 1].y : null;

  return (
    <div style={{ padding: 24, background: "#050505", minHeight: "100vh", color: "#ddd", fontFamily: "monospace" }}>
      {/* Cabeçalho */}
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 16 }}>
        <a href="/panel"
          style={{ color: "#888", fontSize: 12, textDecoration: "none", border: "1px solid #333", padding: "5px 12px" }}>
          ← VOLTAR AO CCO
        </a>
        <a href="/auditoria"
          style={{ color: "#888", fontSize: 12, textDecoration: "none", border: "1px solid #333", padding: "5px 12px" }}>
          AUDITORIA
        </a>
      </div>

      <h1 style={{ color: "#00ff41", fontSize: 18, marginBottom: 4 }}>
        HISTÓRICO — {assetName || id}
      </h1>
      <p style={{ fontSize: 11, color: "#666", marginBottom: 20 }}>
        Temperatura e nível de combustível. Horários em fuso local.
      </p>

      {/* Seletor de período */}
      <div style={{ marginBottom: 20, display: "flex", gap: 8 }}>
        {[6, 12, 24, 48, 72].map((h) => (
          <button
            key={h}
            onClick={() => setHoras(h)}
            style={{
              background: horas === h ? "#003311" : "#111",
              color: horas === h ? "#00ff41" : "#888",
              border: `1px solid ${horas === h ? "#00ff41" : "#333"}`,
              padding: "5px 12px",
              cursor: "pointer",
              fontSize: 12,
            }}>
            {h}h
          </button>
        ))}
      </div>

      {/* Cards de resumo */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "#0a0a0a", border: "1px solid #1a2a1a", padding: "12px 20px", minWidth: 140 }}>
          <div style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>TEMPERATURA ATUAL</div>
          <div style={{ fontSize: 28, color: lastTemp !== null ? (lastTemp > 80 ? "#ff3333" : lastTemp > 60 ? "#ffd700" : "#00ff88") : "#444" }}>
            {lastTemp !== null ? `${lastTemp.toFixed(1)}°C` : "—"}
          </div>
        </div>
        <div style={{ background: "#0a0a0a", border: "1px solid #1a2a1a", padding: "12px 20px", minWidth: 140 }}>
          <div style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>COMBUSTÍVEL ATUAL</div>
          <div style={{ fontSize: 28, color: lastFuel !== null ? (lastFuel < 20 ? "#ff3333" : lastFuel < 50 ? "#ffd700" : "#00ff88") : "#444" }}>
            {lastFuel !== null ? `${lastFuel.toFixed(0)}%` : "—"}
          </div>
        </div>
        <div style={{ background: "#0a0a0a", border: "1px solid #1a2a1a", padding: "12px 20px", minWidth: 140 }}>
          <div style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>PONTOS NO PERÍODO</div>
          <div style={{ fontSize: 28, color: "#4488ff" }}>{pontos.length}</div>
        </div>
      </div>

      {loading && (
        <div style={{ color: "#ffd700", padding: 40, textAlign: "center" }}>CARREGANDO HISTÓRICO...</div>
      )}
      {erro && (
        <div style={{ color: "#ff3333", marginBottom: 16 }}>{erro}</div>
      )}

      {!loading && !erro && (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {/* Gráfico de temperatura */}
          <div style={{ background: "#080808", border: "1px solid #1a1a1a", padding: 20 }}>
            <LineChart
              data={tempData}
              label="TEMPERATURA DO MOTOR"
              unit="°C"
              color="#ff6644"
              yMin={0}
              yMax={Math.max(100, ...(tempData.map((d) => d.y)))}
            />
          </div>

          {/* Gráfico de combustível */}
          <div style={{ background: "#080808", border: "1px solid #1a1a1a", padding: 20 }}>
            <LineChart
              data={fuelData}
              label="NÍVEL DE COMBUSTÍVEL"
              unit="%"
              color="#44aaff"
              yMin={0}
              yMax={100}
            />
          </div>

          {pontos.length === 0 && (
            <div style={{ color: "#666", padding: 40, textAlign: "center" }}>
              Nenhuma leitura encontrada para este gerador no período selecionado.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
