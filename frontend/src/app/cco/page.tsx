"use client";
import { useEffect, useState, useCallback } from "react";

// ─── Imagem base64 do controlador DSE ────────────────────────────────────────
const DSE_IMAGE = "data:image/png;base64,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";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface EspTecnica {
  potencia?: string; fornecedor?: string; controlador?: string; tanque?: string;
  supervisorio?: string; status_com?: string; ip?: string; switch?: string;
  mac?: string; endereco?: string; cidade?: string; obs?: string;
}

interface Ativo {
  id: number; local: string; sublocal: string; sistema: string; nome_ativo: string;
  tag: string; periodicidade: string; data_ult_manu: string | null;
  proxima_manu: string | null; status: string; esp_tecnica?: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseEsp(esp?: string | null): EspTecnica {
  if (!esp) return {};
  try { return JSON.parse(esp); } catch { return {}; }
}

function resolveStatusCom(ativos: Ativo[]): string {
  if (!ativos.length) return "";
  for (const a of ativos) {
    const s = (parseEsp(a.esp_tecnica).status_com || "").toLowerCase();
    if (s.includes("online")) return "online";
  }
  for (const a of ativos) {
    const s = (parseEsp(a.esp_tecnica).status_com || "").toLowerCase();
    if (s.includes("falha")) return "falha";
  }
  for (const a of ativos) {
    const s = (parseEsp(a.esp_tecnica).status_com || "").toLowerCase();
    if (s.includes("sem visual")) return "sem visual";
  }
  return parseEsp(ativos[0].esp_tecnica).status_com || "desconect.";
}

function statusColor(statusCom: string, noData: boolean): string {
  if (noData) return "#ffd700";
  const s = statusCom.toLowerCase();
  if (s.includes("online")) return "#00ccff";
  if (s.includes("falha")) return "#ff3333";
  if (s.includes("sem visual")) return "#aa44ff";
  return "#ffd700";
}

function statusLabel(statusCom: string, noData: boolean): string {
  if (noData) return "SEM DADOS";
  const s = statusCom.toLowerCase();
  if (s.includes("online")) return "ONLINE";
  if (s.includes("falha")) return "FALHA";
  if (s.includes("sem visual")) return "SEM VISUAL";
  return "DESCONECT.";
}

function fmtDate(d: string | null): string {
  if (!d) return "–";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

// ─── Constantes ──────────────────────────────────────────────────────────────
const STATIONS = [
  { code: "MR",  name: "Mercado",        sublocal: "MERCADO" },
  { code: "RD",  name: "Rodoviária",     sublocal: "RODOVIÁRIA" },
  { code: "SP",  name: "São Pedro",      sublocal: "SÃO PEDRO" },
  { code: "FR",  name: "Farrapos",       sublocal: "FARRAPOS" },
  { code: "AP",  name: "Aeroporto",      sublocal: "AEROPORTO" },
  { code: "AN",  name: "Anchieta",       sublocal: "ANCHIETA" },
  { code: "NT",  name: "Niterói",        sublocal: "NITERÓI" },
  { code: "FT",  name: "Fátima",         sublocal: "FÁTIMA" },
  { code: "CN",  name: "Canoas",         sublocal: "CANOAS" },
  { code: "MV",  name: "Mathias Velho",  sublocal: "MATHIAS VELHO" },
  { code: "SL",  name: "São Leopoldo",   sublocal: "SÃO LEOPOLDO" },
  { code: "PB",  name: "Petrobrás",      sublocal: "PETROBRAS" },
  { code: "ES",  name: "Esteio",         sublocal: "ESTEIO" },
  { code: "LP",  name: "Luís Pasteur",   sublocal: "LUIZ PASTEUR" },
  { code: "SC",  name: "Sapucaia",       sublocal: "SAPUCAIA" },
  { code: "UN",  name: "Unisinos",       sublocal: "UNISINOS" },
  { code: "SO",  name: "Rio dos Sinos",  sublocal: "RIO DOS SINOS" },
  { code: "SL2", name: "São Luís",       sublocal: "SÃO LUÍS" },
  { code: "SF",  name: "Santo Afonso",   sublocal: "SANTO AFONSO" },
  { code: "IN",  name: "Industrial",     sublocal: "INDUSTRIAL" },
  { code: "FN",  name: "Fenac",          sublocal: "FENAC" },
  { code: "NH",  name: "Novo Hamburgo",  sublocal: "NOVO HAMBURGO" },
  { code: "SUB", name: "Sub02 Pátio",    sublocal: "SE_2_PÁTIO" },
  { code: "B1",  name: "Bacia Rodo",     sublocal: "BACIA RODO" },
  { code: "ATR", name: "Aeromóvel",      sublocal: "AEROMÓVEL_ATR" },
];

const CCO_SENHA = "jacao010706";

// ─── SVG do Gerador (adaptado para dados de manutenção) ──────────────────────
function GeneratorSVG({
  statusCom, noData, controlador, manutStatus,
}: {
  statusCom: string; noData: boolean; controlador?: string; manutStatus?: string;
}) {
  const s = noData ? "" : statusCom.toLowerCase();
  const isOnline    = s.includes("online");
  const isFalha     = s.includes("falha");
  const isSemVisual = s.includes("sem visual");

  const color = statusColor(statusCom, noData);
  const label = statusLabel(statusCom, noData);

  // grid = closed (rede fornecendo) quando online; gerador fechado quando em falha
  const gridClosed = isOnline;
  const genClosed  = isFalha;

  // filter para imagem do controlador
  const imgFilter = noData
    ? "grayscale(1) brightness(0.4)"
    : isOnline
    ? "hue-rotate(160deg) saturate(1.5) brightness(1.1)"
    : isFalha
    ? "hue-rotate(200deg) saturate(2) brightness(1.3)"
    : "grayscale(0.7) brightness(0.55)";

  const manutColor = manutStatus === "VENCIDO" ? "#ef4444" : manutStatus === "PROXIMO" ? "#f59e0b" : "#10b981";
  const isStemac = (controlador || "").toUpperCase().includes("ST") || (controlador || "").toUpperCase().includes("STEMAC");
  const typeLabel = isStemac ? "STEMAC" : "DSE";
  const typeColor = isStemac ? "#00bfff" : "#ff8c00";

  return (
    <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <rect width="200" height="280" fill="#0a0a0a" rx="4" />
      <image href={DSE_IMAGE} x="5" y="2" width="190" height="210" style={{ filter: imgFilter }} />
      <rect x="5" y="2" width="190" height="150" fill="#0a0a0a" />

      {/* Torre da rede */}
      <g>
        <rect x="40" y="6" width="6" height="3" fill="#ff3399" />
        <rect x="35" y="9" width="16" height="3" fill="#ff3399" />
        <rect x="38" y="12" width="10" height="14" fill="#ff3399" />
        <line x1="43" y1="26" x2="43" y2="34" stroke="#ff3399" strokeWidth="2" />
      </g>
      <line x1="43" y1="34" x2="43" y2="58" stroke={noData ? "#555" : "#4488ff"} strokeWidth="1.5" />

      {/* Chave da rede */}
      <g>
        <circle cx="43" cy="58" r="2" fill={gridClosed ? "#00ff41" : "#666"} />
        <line x1="43" y1="58" x2={gridClosed ? 43 : 50} y2={gridClosed ? 72 : 66}
          stroke={gridClosed ? "#00ff41" : "#999"} strokeWidth="1.5" />
        <circle cx="43" cy="72" r="2" fill={gridClosed ? "#00ff41" : "#666"} />
      </g>
      <line x1="43" y1="72" x2="43" y2="120"
        stroke={genClosed && !noData ? color : "#444"} strokeWidth="1.5"
        strokeDasharray={noData ? "3,2" : undefined} />

      {/* Chave do gerador */}
      <g>
        <circle cx="43" cy="120" r="2" fill={genClosed ? color : "#666"} />
        <line x1="43" y1="120" x2={genClosed ? 43 : 50} y2={genClosed ? 134 : 128}
          stroke={genClosed ? color : "#999"} strokeWidth="1.5" />
        <circle cx="43" cy="134" r="2" fill={genClosed ? color : "#666"} />
      </g>
      <line x1="43" y1="134" x2="43" y2="150"
        stroke={genClosed && !noData ? color : "#444"} strokeWidth="1.5" />

      <rect x="1" y="210" width="198" height="1" fill={color} opacity="0.4" />

      {/* Barra de manutenção */}
      <rect x="10" y="216" width="180" height="10" fill="#0a1530" stroke={manutColor} strokeWidth="0.8" rx="3" />
      <text x="100" y="225" textAnchor="middle" fill={manutColor} fontSize="7" fontFamily="monospace">
        {manutStatus || "MANUTENÇÃO"}
      </text>

      {/* Status indicator */}
      <circle cx="20" cy="244" r="5" fill={color} stroke={color} strokeWidth="0.8" />
      <text x="30" y="248" fill={typeColor} fontSize="8" fontFamily="monospace">{typeLabel}</text>
      <text x="190" y="248" textAnchor="end" fill={color} fontSize="8" fontFamily="monospace">{label}</text>

      {/* Controlador */}
      <text x="100" y="264" textAnchor="middle" fill="#888" fontSize="7" fontFamily="monospace">
        {controlador || "–"}
      </text>

      <rect x="1" y="1" width="198" height="278" fill="none" stroke={color} strokeWidth="1" rx="4" />
    </svg>
  );
}

// ─── Painel lateral de detalhe ───────────────────────────────────────────────
function DetailPanel({
  station, ativos, onClose,
}: {
  station: { code: string; name: string; sublocal: string };
  ativos: Ativo[];
  onClose: () => void;
}) {
  const noData = ativos.length === 0;
  const statusCom = noData ? "" : resolveStatusCom(ativos);
  const color = statusColor(statusCom, noData);
  const label = statusLabel(statusCom, noData);

  const Row = ({ lbl, val, c }: { lbl: string; val: string; c?: string }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid #003300" }}>
      <span style={{ color: "#00cc88", fontSize: 11 }}>{lbl}</span>
      <span style={{ fontWeight: 700, fontSize: 12, color: c || "#00ff41" }}>{val}</span>
    </div>
  );

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.85)" }}
      onClick={onClose}
    >
      <div
        style={{ borderRadius: 6, border: "1px solid #00aa55", padding: 20, width: 500, maxHeight: "90vh", overflowY: "auto", fontFamily: "monospace", background: "#080808" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #003300" }}>
          <div>
            <div style={{ color: "#00ff41", fontWeight: 700, fontSize: 15, letterSpacing: 2 }}>{station.code} — {station.name}</div>
            <div style={{ color: "#00aa55", fontSize: 11, marginTop: 2 }}>{station.sublocal}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#00aa55", fontSize: 10 }}>COMUNICAÇÃO</div>
              <div style={{ color, fontWeight: 700, fontSize: 12 }}>{label}</div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#00aa55", cursor: "pointer", fontSize: 18 }}>✕</button>
          </div>
        </div>

        {noData ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#ffd700" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⚠</div>
            <div style={{ fontSize: 13 }}>Nenhum ativo cadastrado para esta estação</div>
          </div>
        ) : (
          ativos.map((ativo, idx) => {
            const esp = parseEsp(ativo.esp_tecnica);
            const vencido = ativo.status === "VENCIDO";
            const proximo = ativo.status === "PROXIMO";
            const manutColor = vencido ? "#ef4444" : proximo ? "#f59e0b" : "#10b981";
            const sc = statusColor(esp.status_com || "", false);

            return (
              <div key={ativo.id} style={{ marginBottom: 16, border: `1px solid #001a0a`, borderRadius: 6, padding: 12 }}>
                {ativos.length > 1 && (
                  <div style={{ color: "#00cc88", fontSize: 10, fontWeight: 700, marginBottom: 8, letterSpacing: 1.5 }}>
                    GGD #{idx + 1} — {ativo.tag}
                  </div>
                )}

                {/* Especificações técnicas */}
                <div style={{ color: "#00cc88", fontSize: 10, fontWeight: 700, marginBottom: 6, letterSpacing: 1.5 }}>ESPECIFICAÇÕES TÉCNICAS</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 12 }}>
                  {[
                    ["Controlador", esp.controlador || "–"],
                    ["Potência",    esp.potencia ? `${esp.potencia} kVA` : "–"],
                    ["Fornecedor",  esp.fornecedor || "–"],
                    ["Tanque",      esp.tanque ? `${esp.tanque} L` : "–"],
                    ["Supervisório",esp.supervisorio || "–"],
                    ["IP",          esp.ip || "–"],
                    ["Switch",      esp.switch || "–"],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <div style={{ color: "#00aa55", fontSize: 9 }}>{l}</div>
                      <div style={{ color: "#00ff41", fontSize: 11, fontWeight: 600 }}>{v}</div>
                    </div>
                  ))}
                  <div>
                    <div style={{ color: "#00aa55", fontSize: 9 }}>Status Comunicação</div>
                    <div style={{ color: sc, fontSize: 11, fontWeight: 700 }}>{esp.status_com || "–"}</div>
                  </div>
                </div>

                {/* Manutenção */}
                <div style={{ color: "#00cc88", fontSize: 10, fontWeight: 700, marginBottom: 6, letterSpacing: 1.5 }}>MANUTENÇÃO</div>
                <Row lbl="TAG / Ativo"         val={ativo.tag || ativo.nome_ativo} />
                <Row lbl="Periodicidade"        val={ativo.periodicidade || "–"} />
                <Row lbl="Última manutenção"    val={fmtDate(ativo.data_ult_manu)} c={!ativo.data_ult_manu ? "#ef4444" : "#00ff41"} />
                <Row lbl="Próxima manutenção"   val={fmtDate(ativo.proxima_manu)} c={vencido ? "#ef4444" : proximo ? "#f59e0b" : "#00ff41"} />

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: vencido ? "#2d0a0a" : proximo ? "#2d1a00" : "#0a2d10", color: manutColor, letterSpacing: 1, textTransform: "uppercase" }}>
                    {vencido ? "VENCIDO" : proximo ? "PRÓXIMO" : "EM DIA"}
                  </span>
                </div>

                {esp.obs && (
                  <div style={{ marginTop: 8, padding: "6px 8px", background: "#001a0a", borderRadius: 4, color: "#888", fontSize: 10 }}>
                    OBS: {esp.obs}
                  </div>
                )}
              </div>
            );
          })
        )}

        <div style={{ textAlign: "center", color: "#005522", fontSize: 10, paddingTop: 8, borderTop: "1px solid #003300" }}>
          Clique fora para fechar
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────
export default function CCOPage() {
  const [ativos, setAtivos]   = useState<Ativo[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [auth, setAuth]       = useState(false);
  const [senha, setSenha]     = useState("");
  const [erroSenha, setErroSenha] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<{ station: (typeof STATIONS)[0]; ativos: Ativo[] } | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const p = new URLSearchParams({ sistema: "GGD's", page_size: "200" });
      const res = await fetch(`/api/v1/saee-ativos?${p}`);
      const data = await res.json();
      setAtivos(data.items || []);
      setLastUpdate(new Date().toLocaleTimeString("pt-BR"));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (auth) loadAll(); }, [auth, loadAll]);
  useEffect(() => {
    if (!auth) return;
    const i = setInterval(loadAll, 60_000);
    return () => clearInterval(i);
  }, [auth, loadAll]);

  const getAtivos = (sublocal: string) =>
    ativos.filter(a => a.sublocal === sublocal);

  // Contadores do header
  const totalOnline    = STATIONS.filter(st => resolveStatusCom(getAtivos(st.sublocal)).toLowerCase().includes("online")).length;
  const totalFalha     = STATIONS.filter(st => resolveStatusCom(getAtivos(st.sublocal)).toLowerCase().includes("falha")).length;
  const totalVencidos  = ativos.filter(a => a.status === "VENCIDO").length;

  const row1 = STATIONS.slice(0, 13);
  const row2 = STATIONS.slice(13, 25);

  // ─── Tela de autenticação CCO ──────────────────────────────────────────────
  if (!auth) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", background: "#050505" }}>
        <div style={{ border: "1px solid #00aa55", borderRadius: 6, padding: 32, width: 320, background: "#0a0a0a" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ color: "#00ff41", fontSize: 18, fontWeight: 700, letterSpacing: 3, marginBottom: 4 }}>TRENSURB — SENERG</div>
            <div style={{ color: "#00aa55", fontSize: 11 }}>SUPERVISÓRIO CCO</div>
            <div style={{ color: "#ffd700", fontSize: 10, marginTop: 6 }}>ACESSO RESTRITO</div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: "#00aa55", fontSize: 11, display: "block", marginBottom: 6 }}>SENHA DE ACESSO</label>
            <input
              type="password"
              style={{ width: "100%", background: "#000", border: "1px solid #00aa55", color: "#00ff41", padding: "8px 12px", borderRadius: 4, fontSize: 13, fontFamily: "monospace", outline: "none", boxSizing: "border-box" }}
              value={senha}
              onChange={e => { setSenha(e.target.value); setErroSenha(false); }}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  if (senha === CCO_SENHA) setAuth(true);
                  else { setErroSenha(true); setSenha(""); }
                }
              }}
              placeholder="**********"
              autoFocus
            />
            {erroSenha && <p style={{ color: "#ef4444", fontSize: 11, margin: "4px 0 0" }}>Senha incorreta!</p>}
          </div>
          <button
            onClick={() => {
              if (senha === CCO_SENHA) setAuth(true);
              else { setErroSenha(true); setSenha(""); }
            }}
            style={{ width: "100%", padding: "8px 0", border: "1px solid #00aa55", color: "#00ff41", background: "transparent", borderRadius: 4, fontSize: 13, cursor: "pointer", fontFamily: "monospace", letterSpacing: 1 }}
          >
            ACESSAR
          </button>
        </div>
      </div>
    );
  }

  // ─── Painel CCO principal ──────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", color: "#00ff41", fontFamily: "monospace", overflow: "hidden", background: "#050505" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 16px", borderBottom: "1px solid #003300", background: "#080808" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00ff41", animation: "pulse 2s infinite" }} />
          <span style={{ color: "#00ff41", fontSize: 13, fontWeight: 700, letterSpacing: 3 }}>TRENSURB — SENERG</span>
          <span style={{ color: "#00aa55", fontSize: 11 }}>SUPERVISÓRIO CCO · GERADORES</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: "#00ccff", fontSize: 11 }}>
            ● {totalOnline} ONLINE
          </span>
          {totalFalha > 0 && (
            <span style={{ color: "#ff3333", fontSize: 11 }}>
              ● {totalFalha} FALHA
            </span>
          )}
          {totalVencidos > 0 && (
            <span style={{ color: "#f59e0b", fontSize: 11 }}>
              ⚠ {totalVencidos} VENC.
            </span>
          )}
          {loading && <span style={{ color: "#ffd700", fontSize: 11 }}>CARREGANDO...</span>}
          <span style={{ color: "#00aa55", fontSize: 11 }}>ATZ: {lastUpdate || "--:--:--"}</span>
          <button
            onClick={() => document.documentElement.requestFullscreen?.()}
            style={{ color: "#00aa55", fontSize: 10, border: "1px solid #003300", padding: "2px 8px", borderRadius: 3, background: "transparent", cursor: "pointer" }}
          >
            TELA CHEIA
          </button>
        </div>
      </div>

      {/* Grid de geradores */}
      <div style={{ padding: 6, display: "flex", flexDirection: "column", gap: 6, height: "calc(100vh - 42px)" }}>
        {[row1, row2].map((row, rowIdx) => (
          <div key={rowIdx} style={{ flex: 1, display: "grid", gap: 5, gridTemplateColumns: `repeat(${row.length}, 1fr)` }}>
            {row.map((station) => {
              const stAtivos = getAtivos(station.sublocal);
              const noData   = stAtivos.length === 0;
              const statusCom = noData ? "" : resolveStatusCom(stAtivos);
              const color    = statusColor(statusCom, noData);
              const label    = statusLabel(statusCom, noData);

              // Pior status de manutenção entre os ativos da estação
              const manutStatus = stAtivos.some(a => a.status === "VENCIDO")
                ? "VENCIDO"
                : stAtivos.some(a => a.status === "PROXIMO")
                ? "PROXIMO"
                : stAtivos.length ? "OK" : "";

              // Primeiro controlador encontrado
              const controlador = stAtivos.map(a => parseEsp(a.esp_tecnica).controlador).find(Boolean);

              const isStemac = (controlador || "").toUpperCase().includes("ST") || (controlador || "").toUpperCase().includes("STEMAC");
              const typeColor = isStemac ? "#00bfff" : "#ff8c00";
              const typeLabel = isStemac ? "STEMAC" : "DSE";

              return (
                <div
                  key={station.code}
                  style={{ display: "flex", flexDirection: "column", borderRadius: 4, cursor: "pointer", border: `1px solid ${color}`, background: "#0a0a0a", transition: "filter .15s" }}
                  onClick={() => setSelected({ station, ativos: stAtivos })}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.filter = "brightness(1.25)"}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.filter = ""}
                >
                  {/* Cabeçalho do card */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 8px", background: "#0f0f0f", borderBottom: `1px solid ${color}33` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontWeight: 700, color: typeColor, fontSize: 12 }}>{station.code}</span>
                      <span style={{ color: typeColor, fontSize: 7, opacity: 0.85 }}>{noData ? "" : typeLabel}</span>
                    </div>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
                  </div>

                  {/* SVG gerador */}
                  <div style={{ flex: 1, padding: 3, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <GeneratorSVG
                      statusCom={statusCom}
                      noData={noData}
                      controlador={controlador}
                      manutStatus={manutStatus}
                    />
                  </div>

                  {/* Rodapé do card */}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 8px", borderTop: `1px solid ${color}33`, fontSize: 9 }}>
                    <span style={{ color: typeColor }}>{station.name}</span>
                    <span style={{ color }}>
                      {stAtivos.length > 1 ? `${stAtivos.length} GGDs` : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Modal de detalhe */}
      {selected && (
        <DetailPanel
          station={selected.station}
          ativos={selected.ativos}
          onClose={() => setSelected(null)}
        />
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
    </div>
  );
}
