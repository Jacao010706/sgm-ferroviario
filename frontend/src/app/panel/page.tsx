"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

function GeneratorSVG({ mode, fuelLevel, gridVoltage, voltageL1, running }: { mode: any, fuelLevel: any, gridVoltage: any, voltageL1: any, running: boolean }) {
  const color = running ? "#00ff41" : mode === 1 ? "#00ff41" : mode === 0 ? "#ffd700" : "#555";
  const fuel = fuelLevel ?? 0;
  return (
    <svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <rect width="200" height="240" fill="#0a0a0a" rx="4"/>
      {/* REDE */}
      <text x="100" y="14" textAnchor="middle" fill="#00bfff" fontSize="7" fontFamily="monospace">REDE</text>
      <rect x="70" y="17" width="60" height="14" fill="#001a2e" stroke="#00bfff" strokeWidth="1" rx="2"/>
      <text x="100" y="27" textAnchor="middle" fill="#00bfff" fontSize="7" fontFamily="monospace">{gridVoltage ? gridVoltage+"V" : "---"}</text>
      {/* Torre */}
      <line x1="100" y1="31" x2="100" y2="44" stroke="#00bfff" strokeWidth="1.5"/>
      <line x1="85" y1="37" x2="115" y2="37" stroke="#00bfff" strokeWidth="1"/>
      <circle cx="85" cy="37" r="2" fill="#00bfff"/>
      <circle cx="100" cy="37" r="2" fill="#00bfff"/>
      <circle cx="115" cy="37" r="2" fill="#00bfff"/>
      {/* Linha rede-trafo */}
      <line x1="100" y1="44" x2="100" y2="60" stroke={color} strokeWidth="1.5"/>
      {/* Transformador */}
      <ellipse cx="100" cy="64" rx="16" ry="7" fill="none" stroke={color} strokeWidth="1.2"/>
      <ellipse cx="100" cy="74" rx="16" ry="7" fill="none" stroke={color} strokeWidth="1.2"/>
      <line x1="84" y1="64" x2="84" y2="74" stroke={color} strokeWidth="0.8"/>
      <line x1="116" y1="64" x2="116" y2="74" stroke={color} strokeWidth="0.8"/>
      {/* Linha trafo-gerador */}
      <line x1="100" y1="81" x2="100" y2="98" stroke={color} strokeWidth="1.5"/>
      {/* Corpo gerador */}
      <rect x="30" y="98" width="140" height="70" fill="#001a00" stroke={color} strokeWidth="1.5" rx="4"/>
      {/* Motor */}
      <rect x="36" y="104" width="55" height="58" fill="#002200" stroke={color} strokeWidth="1" rx="3"/>
      <text x="63" y="116" textAnchor="middle" fill={color} fontSize="6" fontFamily="monospace">MOTOR</text>
      <rect x="40" y="120" width="9" height="18" fill={running?"#004400":"#001a00"} stroke={color} strokeWidth="0.8" rx="1"/>
      <rect x="53" y="120" width="9" height="18" fill={running?"#004400":"#001a00"} stroke={color} strokeWidth="0.8" rx="1"/>
      <rect x="66" y="120" width="9" height="18" fill={running?"#004400":"#001a00"} stroke={color} strokeWidth="0.8" rx="1"/>
      <line x1="36" y1="148" x2="91" y2="148" stroke={color} strokeWidth="0.8"/>
      {/* Alternador */}
      <rect x="95" y="104" width="68" height="58" fill="#002200" stroke={color} strokeWidth="1" rx="3"/>
      <text x="129" y="116" textAnchor="middle" fill={color} fontSize="6" fontFamily="monospace">ALTERNADOR</text>
      <ellipse cx="115" cy="136" rx="10" ry="12" fill="none" stroke={color} strokeWidth="1.2"/>
      <ellipse cx="143" cy="136" rx="10" ry="12" fill="none" stroke={color} strokeWidth="1.2"/>
      <text x="129" y="152" textAnchor="middle" fill={color} fontSize="6" fontFamily="monospace">{voltageL1 ? voltageL1+"V" : "0V"}</text>
      {/* Exaustao */}
      <rect x="155" y="94" width="6" height="12" fill="#333" stroke="#555" strokeWidth="0.8" rx="1"/>
      {running && <ellipse cx="158" cy="92" rx="4" ry="2" fill="#ff6600" opacity="0.6"/>}
      {/* Tanque */}
      <rect x="32" y="175" width="136" height="14" fill="#001a00" stroke={color} strokeWidth="1" rx="2"/>
      <rect x="33" y="176" width={Math.max(0,Math.min(134,134*fuel/100))} height="12"
        fill={fuel>50?"#00aa00":fuel>20?"#ffd700":"#ff0000"} rx="1" opacity="0.85"/>
      <text x="100" y="186" textAnchor="middle" fill="white" fontSize="7" fontFamily="monospace">{fuel}%</text>
      {/* Status */}
      <circle cx="42" cy="206" r="5" fill={running?"#00ff41":"#333"} stroke={color} strokeWidth="0.8"/>
      <text x="52" y="209" fill={color} fontSize="7" fontFamily="monospace">{mode===1?"AUTO":mode===0?"MANUAL":"---"}</text>
      <text x="158" y="209" textAnchor="end" fill={running?"#00ff41":"#666"} fontSize="7" fontFamily="monospace">{running?"OPERANDO":"PARADO"}</text>
      {/* Linha saida */}
      <line x1="100" y1="168" x2="100" y2="175" stroke={color} strokeWidth="1.5"/>
      <rect x="1" y="1" width="198" height="238" fill="none" stroke="#1a1a1a" strokeWidth="0.8" rx="4"/>
    </svg>
  );
}

const STATIONS = [
  {code:"MR",name:"Mercado"},{code:"RD",name:"Rodoviária"},{code:"SP",name:"São Pedro"},
  {code:"FR",name:"Farrapos"},{code:"AP",name:"Aeroporto"},{code:"AN",name:"Anchieta"},
  {code:"NT",name:"Niterói"},{code:"FT",name:"Fátima"},{code:"CN",name:"Canoas"},
  {code:"MV",name:"Mathias Velho"},{code:"SL",name:"São Leopoldo"},{code:"PB",name:"Petrobras"},
  {code:"ES",name:"Esteio"},{code:"LP",name:"Luiz Pasteur"},{code:"SC",name:"Sapucaia"},
  {code:"UN",name:"Unisinos"},{code:"SO",name:"Rio dos Sinos"},{code:"RS",name:"Rodoviária Sul"},
  {code:"SF",name:"Santo Afonso"},{code:"IN",name:"Industrial"},{code:"FN",name:"Fenac"},
  {code:"NH",name:"Novo Hamburgo"},{code:"SUB",name:"Sub02 Pátio"},
  {code:"B1",name:"Bacia 1"},{code:"B2",name:"Bacia 2"},
];

export default function PanelPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [latest, setLatest] = useState<Record<string, Record<string, any>>>({});
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [auth, setAuth] = useState(false);
  const [senha, setSenha] = useState("");
  const [erroSenha, setErroSenha] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    try {
      const res = await api.get("/assets/", { params: { limit: 50 } });
      const allAssets = res.data.filter((a: any) => !a.parent_id);
      setAssets(allAssets);
      const readings: Record<string, Record<string, any>> = {};
      await Promise.all(allAssets.map(async (asset: any) => {
        try {
          const r = await api.get("/iot/readings/" + asset.id, { params: { hours: 1 } });
          const latestMap: Record<string, any> = {};
          r.data.forEach((reading: any) => {
            if (!latestMap[reading.sensor_id] || reading.timestamp > latestMap[reading.sensor_id].timestamp) {
              latestMap[reading.sensor_id] = reading;
            }
          });
          readings[asset.id] = latestMap;
        } catch { readings[asset.id] = {}; }
      }));
      setLatest(readings);
      setLastUpdate(new Date().toLocaleTimeString("pt-BR"));
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    const interval = setInterval(loadAll, 60000);
    return () => clearInterval(interval);
  }, [loadAll]);

  const getAssetByCode = (code: string) => {
    return assets.find(a => a.tag?.includes(code) || a.name?.toLowerCase().includes(STATIONS.find(s=>s.code===code)?.name.toLowerCase()||""));
  };

  const getVal = (assetId: string, sensor: string) => latest[assetId]?.[sensor]?.value;

  const row1 = STATIONS.slice(0, 12);
  const row2 = STATIONS.slice(12, 25);

  if (!auth) return (
    <div className="min-h-screen bg-black flex items-center justify-center font-mono" style={{background:"#050505"}}>
      <div className="border border-green-800 rounded p-8 w-80" style={{background:"#0a0a0a"}}>
        <div className="text-center mb-6">
          <div className="text-green-400 text-lg font-bold tracking-widest mb-1">TRENSURB — SENERG</div>
          <div className="text-green-700 text-xs">PAINEL DE MONITORAMENTO CCO</div>
          <div className="text-yellow-500 text-xs mt-2">⚠ SISTEMA EM IMPLANTAÇÃO</div>
        </div>
        <div className="mb-4">
          <label className="text-green-600 text-xs block mb-2">SENHA DE ACESSO</label>
          <input type="password" className="w-full bg-black border border-green-800 text-green-400 px-3 py-2 rounded text-sm focus:outline-none focus:border-green-500 font-mono"
            value={senha} onChange={e => { setSenha(e.target.value); setErroSenha(false); }}
            onKeyDown={e => { if (e.key === "Enter") { if (senha === "jacao010706") { setAuth(true); } else { setErroSenha(true); setSenha(""); } }}}
            placeholder="••••••••••" autoFocus />
          {erroSenha && <p className="text-red-500 text-xs mt-1">Senha incorreta!</p>}
        </div>
        <button onClick={() => { if (senha === "jacao010706") { setAuth(true); } else { setErroSenha(true); setSenha(""); } }}
          className="w-full py-2 border border-green-700 text-green-400 rounded text-sm hover:bg-green-900 transition-colors font-mono">
          ACESSAR
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono overflow-hidden" style={{background:"#050505"}}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-green-900" style={{background:"#080808"}}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/>
          <span className="text-green-400 text-sm font-bold tracking-widest">TRENSURB — SENERG</span>
          <span className="text-green-700 text-xs">SISTEMA DE MONITORAMENTO DE GERADORES</span>
        </div>
        <div className="flex items-center gap-4">
          {loading && <span className="text-yellow-400 text-xs animate-pulse">CARREGANDO...</span>}
          <span className="text-green-600 text-xs">ATUALIZAÇÃO: {lastUpdate || "--:--:--"}</span>
          <div className="w-2 h-2 rounded-full bg-green-400"/>
        </div>
      </div>

      {/* Grid geradores */}
      <div className="p-2 flex flex-col gap-2 h-[calc(100vh-48px)]">
        {[row1, row2].map((row, rowIdx) => (
          <div key={rowIdx} className="flex-1 grid gap-2" style={{gridTemplateColumns:"repeat(13,1fr)"}}>
            {row.map((station) => {
              const asset = getAssetByCode(station.code);
              const assetId = asset?.id;
              const mode = assetId ? getVal(assetId, "mode") : undefined;
              const fuel = assetId ? getVal(assetId, "fuel_level") : undefined;
              const gridV = assetId ? getVal(assetId, "grid_voltage_l1") : undefined;
              const voltL1 = assetId ? getVal(assetId, "voltage_l1") : undefined;
              const temp = assetId ? getVal(assetId, "temperature") : undefined;
              const running = voltL1 != null && voltL1 > 0;
              const fuelLow = fuel != null && fuel < 50;
              const borderColor = running ? "#00ff41" : mode === 1 ? "#00ff41" : mode === 0 ? "#ffd700" : "#333";
              return (
                <div key={station.code} className="flex flex-col rounded" style={{border:`1px solid ${borderColor}`,background:"#0a0a0a"}}>
                  {/* Header card */}
                  <div className="flex items-center justify-between px-2 py-1" style={{background:"#0f0f0f",borderBottom:`1px solid ${borderColor}33`}}>
                    <span className="text-xs font-bold" style={{color:borderColor}}>{station.code}</span>
                    <span className="text-xs" style={{color:borderColor,fontSize:"9px"}}>{mode===1?"AUTO":mode===0?"MAN":"---"}</span>
                    <div className="w-2 h-2 rounded-full" style={{background:running?"#00ff41":mode!=null?"#ffd700":"#333"}}/>
                  </div>
                  {/* SVG */}
                  <div className="flex-1 flex items-center justify-center p-1">
                    <GeneratorSVG mode={mode} fuelLevel={fuel} gridVoltage={gridV} voltageL1={voltL1} running={running}/>
                  </div>
                  {/* Footer dados */}
                  <div className="px-1 py-1" style={{borderTop:`1px solid ${borderColor}33`,fontSize:"8px"}}>
                    <div className="flex justify-between">
                      <span style={{color:"#00bfff"}}>{gridV ? gridV+"V" : "--"}</span>
                      <span style={{color:temp>80?"#ff4444":"#aaa"}}>{temp ? temp+"°C" : "--"}</span>
                      <span style={{color:fuelLow?"#ff4444":fuel>50?"#00aa00":"#ffd700"}}>{fuel!=null?fuel+"%":"--"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
