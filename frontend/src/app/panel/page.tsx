"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

const DSE_IMAGE = "data:image/png;base64,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";

function GeneratorSVG({ mode, fuelLevel, gridVoltage, voltageL1, running, temp, battery }: { mode: any, fuelLevel: any, gridVoltage: any, voltageL1: any, running: boolean, temp: any, battery: any }) {
  const color = running ? "#ff3333" : "#4488ff";
  const fuel = fuelLevel ?? 0;
  const fuelColor = fuel > 50 ? "#00aa00" : fuel > 20 ? "#ffd700" : "#ff0000";
  return (
    <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <rect width="200" height="280" fill="#0a0a0a" rx="4"/>
      <image href={DSE_IMAGE} x="5" y="2" width="190" height="210" style={{filter: running ? "hue-rotate(200deg) saturate(2) brightness(1.3)" : "saturate(0.6) brightness(0.7)"}}/>
      <rect x="1" y="210" width="198" height="1" fill={color} opacity="0.4"/>
      <rect x="10" y="216" width="180" height="12" fill="#0a1530" stroke={color} strokeWidth="0.8" rx="3"/>
      <rect x="11" y="217" width={Math.max(0,Math.min(178,178*fuel/100))} height="10" fill={fuelColor} rx="2" opacity="0.9"/>
      <text x="100" y="227" textAnchor="middle" fill="white" fontSize="7" fontFamily="monospace">{fuel}%</text>
      <circle cx="20" cy="244" r="5" fill={running?"#00ff41":"#333"} stroke={color} strokeWidth="0.8"/>
      <text x="30" y="248" fill={color} fontSize="8" fontFamily="monospace">{mode===1?"AUTO":mode===0?"MANUAL":"---"}</text>
      <text x="190" y="248" textAnchor="end" fill={running?"#00ff41":"#666"} fontSize="8" fontFamily="monospace">{running?"OPERANDO":"PARADO"}</text>
      <text x="20" y="264" fill="#888" fontSize="7" fontFamily="monospace">{temp ? Math.round(Number(temp))+"C" : "--"}</text>
      <text x="100" y="264" textAnchor="middle" fill="#00cc44" fontSize="7" fontFamily="monospace">{gridVoltage ? Math.round(Number(gridVoltage))+"V" : "---"}</text>
      <text x="190" y="264" textAnchor="end" fill="#888" fontSize="7" fontFamily="monospace">{battery ? Number(battery).toFixed(1)+"V" : "--"}</text>
      <rect x="1" y="1" width="198" height="278" fill="none" stroke={color} strokeWidth="1" rx="4"/>
    </svg>
  );
}

function DetailPanel({ station, asset, vals, onClose, onCommand, cmdLoading, cmdMsg }: { station: any, asset: any, vals: Record<string,any>, onClose: () => void, onCommand: (id:string,action:string)=>void, cmdLoading: boolean, cmdMsg: {text:string,ok:boolean}|null }) {
  const v = (key: string) => vals?.[key]?.value;
  const fmt = (val: any, unit: string, dec = 0) => val != null ? Number(val).toFixed(dec) + (unit ? " " + unit : "") : "---";
  const isRunning = v("is_running");
  const running = isRunning != null ? isRunning > 0 : (v("voltage_l1") != null && v("voltage_l1") > 50);
  const mode = v("mode");
  const fuel = v("fuel_level");
  const temp = v("temperature");
  const color = running ? "#00ff41" : "#ffd700";
  const Row = ({ label, val, color: c }: { label: string, val: string, color?: string }) => (
    <div className="flex justify-between items-center py-1 border-b border-green-900">
      <span className="text-green-600 text-xs">{label}</span>
      <span className="font-bold text-sm" style={{ color: c || "#00ff41" }}>{val}</span>
    </div>
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.85)" }} onClick={onClose}>
      <div className="rounded border border-green-700 p-4 w-[480px] max-h-[90vh] overflow-y-auto font-mono"
        style={{ background: "#080808" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-green-800">
          <div>
            <div className="text-green-400 font-bold text-base tracking-widest">{station.code} {"\u2014"} {station.name}</div>
            <div className="text-green-700 text-xs">{asset?.name || "Gerador"}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="text-xs text-green-600">MODO</div>
              <div className="font-bold text-sm" style={{ color }}>{mode===1?"AUTO":mode===0?"MANUAL":"REMOTO"}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-green-600">STATUS</div>
              <div className="font-bold text-sm" style={{ color: running ? "#00ff41" : "#666" }}>{running?"OPERANDO":"PARADO"}</div>
            </div>
            <button onClick={onClose} className="text-green-700 hover:text-green-400 text-lg ml-2">x</button>
          </div>
        </div>
        <div className="mb-3">
          <div className="text-xs text-blue-400 font-bold mb-1 tracking-wider">REDE (UTILITY)</div>
          <div className="grid grid-cols-3 gap-2">
            {([["L1","grid_voltage_l1"],["L2","grid_voltage_l2"],["L3","grid_voltage_l3"]] as [string,string][]).map(([l,k]) => (
              <div key={l} className="rounded p-2 text-center" style={{background:"#001a2e",border:"1px solid #00bfff44"}}>
                <div className="text-blue-400 text-xs">{l}</div>
                <div className="text-blue-300 font-bold text-sm">{fmt(v(k),"V",0)}</div>
              </div>
            ))}
          </div>
          <div className="mt-1 text-center">
            <span className="text-blue-600 text-xs">Freq: </span>
            <span className="text-blue-300 text-xs font-bold">{fmt(v("grid_frequency"),"Hz")}</span>
          </div>
        </div>
        <div className="mb-3">
          <div className="text-xs font-bold mb-1 tracking-wider" style={{color}}>GERADOR</div>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {([["L1","voltage_l1"],["L2","voltage_l2"],["L3","voltage_l3"]] as [string,string][]).map(([l,k]) => (
              <div key={l} className="rounded p-2 text-center" style={{background:"#001a00",border:"1px solid #00ff4133"}}>
                <div className="text-xs" style={{color}}>{l} Tensao</div>
                <div className="font-bold text-sm" style={{color}}>{running ? fmt(v(k),"V",0) : "0 V"}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {([["I1","current_l1"],["I2","current_l2"],["I3","current_l3"]] as [string,string][]).map(([l,k]) => (
              <div key={l} className="rounded p-2 text-center" style={{background:"#001a00",border:"1px solid #00ff4133"}}>
                <div className="text-xs" style={{color}}>{l} Corrente</div>
                <div className="font-bold text-sm" style={{color}}>{running ? fmt(v(k),"A",0) : "0 A"}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div className="rounded p-2" style={{background:"#0a1a00",border:"1px solid #00ff4133"}}>
            <div className="text-xs text-green-600 mb-1">POTENCIA</div>
            <Row label="kW" val={fmt(v("power_kw"),"kW")} />
            <Row label="kVA" val={fmt(v("power_kva"),"kVA")} />
            <Row label="kVAr" val={fmt(v("power_kvar"),"kVAr")} />
            <Row label="Fator P" val={fmt(v("power_factor"),"",2)} />
          </div>
          <div className="rounded p-2" style={{background:"#0a1a00",border:"1px solid #00ff4133"}}>
            <div className="text-xs text-green-600 mb-1">MEDICOES</div>
            <Row label="Frequencia" val={fmt(v("frequency"),"Hz")} />
            <Row label="Temperatura" val={fmt(v("temperature"),"C",0)} color={temp>80?"#ff4444":"#00ff41"} />
            <Row label="Bateria" val={fmt(v("battery"),"V")} />
            <Row label="Horas" val={fmt(v("runtime_hours"),"h",0)} />
          </div>
        </div>
        <div className="mb-3 rounded p-2" style={{background:"#0a1a00",border:"1px solid #00ff4133"}}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-green-600">NIVEL DE COMBUSTIVEL</span>
            <span className="font-bold text-sm" style={{color:fuel>50?"#00aa00":fuel>20?"#ffd700":"#ff0000"}}>{fuel!=null?fuel+"%":"---"}</span>
          </div>
          <div className="w-full rounded h-4 overflow-hidden" style={{background:"#001a00",border:"1px solid #333"}}>
            <div className="h-full rounded transition-all" style={{width:fuel!=null?Math.min(100,fuel)+"%":"0%",background:fuel>50?"#00aa00":fuel>20?"#ffd700":"#ff0000"}}/>
          </div>
        </div>
        <div className="mb-3">
          <div className="text-xs text-green-600 mb-2 font-bold">COMANDO REMOTO</div>
          {cmdMsg && <div className={`text-xs mb-2 p-2 rounded ${cmdMsg.ok?"text-green-400 border border-green-800":"text-red-400 border border-red-800"}`}>{cmdMsg.text}</div>}
          <div className="flex gap-2">
            <button disabled={cmdLoading||!asset} onClick={()=>asset&&onCommand(asset.id,"start")} className="flex-1 py-2 rounded text-sm font-bold disabled:opacity-40" style={{background:"#003300",border:"1px solid #00ff41",color:"#00ff41"}}>{cmdLoading?"AGUARDE...":"LIGAR"}</button>
            <button disabled={cmdLoading||!asset} onClick={()=>asset&&onCommand(asset.id,"manual")} className="flex-1 py-2 rounded text-sm font-bold disabled:opacity-40" style={{background:"#1a1000",border:"1px solid #ff8c00",color:"#ff8c00"}}>{cmdLoading?"AGUARDE...":"MANUAL"}</button>
            <button disabled={cmdLoading||!asset} onClick={()=>asset&&onCommand(asset.id,"stop")} className="flex-1 py-2 rounded text-sm font-bold disabled:opacity-40" style={{background:"#330000",border:"1px solid #ff4444",color:"#ff4444"}}>{cmdLoading?"AGUARDE...":"DESLIGAR"}</button>
            <button disabled={cmdLoading||!asset} onClick={()=>asset&&onCommand(asset.id,"auto")} className="flex-1 py-2 rounded text-sm font-bold disabled:opacity-40" style={{background:"#1a1a00",border:"1px solid #ffd700",color:"#ffd700"}}>{cmdLoading?"AGUARDE...":"AUTO"}</button>
          </div>
        </div>
        <div className="text-center text-green-800 text-xs pt-2 border-t border-green-900">Clique fora para fechar</div>
      </div>
    </div>
  );
}

const STATIONS = [
  {code:"MR",name:"Mercado"},{code:"RD",name:"Rodoviaria"},{code:"SP",name:"Sao Pedro"},
  {code:"FR",name:"Farrapos"},{code:"AP",name:"Aeroporto"},{code:"AN",name:"Anchieta"},
  {code:"NT",name:"Niteroi"},{code:"FT",name:"Fatima"},{code:"CN",name:"Canoas"},
  {code:"MV",name:"Mathias Velho"},{code:"SL",name:"Sao Leopoldo"},{code:"PB",name:"Petrobras"},
  {code:"ES",name:"Esteio"},{code:"LP",name:"Luiz Pasteur"},{code:"SC",name:"Sapucaia"},
  {code:"UN",name:"Unisinos"},{code:"SO",name:"Rio dos Sinos"},{code:"RS",name:"Rodoviaria Sul"},
  {code:"SF",name:"Santo Afonso"},{code:"IN",name:"Industrial"},{code:"FN",name:"Fenac"},
  {code:"NH",name:"Novo Hamburgo"},{code:"SUB",name:"Sub02 Patio"},
  {code:"B1",name:"Bacia 1"},{code:"B2",name:"Bacia 2"},
];

const API_URL = "https://laudable-peace-production-09cd.up.railway.app/api/v1";

async function ensureToken(): Promise<void> {
  if (typeof window === "undefined") return;
  if (localStorage.getItem("access_token")) return;
  try {
    const r = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({email: "admin2@sgm.com", password: "admin123"}),
    });
    const data = await r.json();
    if (data.access_token) localStorage.setItem("access_token", data.access_token);
  } catch {}
}

export default function PanelPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [latest, setLatest] = useState<Record<string, Record<string, any>>>({});
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [auth, setAuth] = useState(false);
  const [senha, setSenha] = useState("");
  const [erroSenha, setErroSenha] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<{station:any,asset:any}|null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [cmdLoading, setCmdLoading] = useState(false);
  const [cmdMsg, setCmdMsg] = useState<{text:string,ok:boolean}|null>(null);

  const enviarComando = async (assetId: string, action: string) => {
    setCmdLoading(true);
    setCmdMsg(null);
    try {
      await api.post(`/generators/${assetId}/command`, { action });
      setCmdMsg({ text: `Comando "${action}" enviado com sucesso!`, ok: true });
    } catch (e: any) {
      const detail = e?.response?.data?.detail || "Erro ao enviar comando.";
      setCmdMsg({ text: detail, ok: false });
    } finally {
      setCmdLoading(false);
    }
  };

  const loadAll = useCallback(async () => {
    await ensureToken();
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
      try {
        const al = await api.get("/alerts/", { params: { status: "active", limit: 100 } });
        setAlerts(al.data);
      } catch { setAlerts([]); }
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { const i = setInterval(loadAll, 60000); return () => clearInterval(i); }, [loadAll]);

  const CODE_TO_TAG: Record<string,string> = { MR:"GMG-MERCADO",RD:"GMG-RODOVIARIA",SP:"GMG-SAOPEDRO",FR:"GMG-FARRAPOS",AP:"GMG-AEROPORTO",AN:"GMG-ANCHIETA",NT:"GMG-NITEROI",FT:"GMG-FATIMA",CN:"GMG-CANOAS",MV:"GMG-MATHIASVELHO",SL:"GMG-SAOLUIS",PB:"GMG-PETROBRAS",ES:"GMG-ESTEIO",LP:"GMG-LUIZPASTEUR",SC:"GMG-SAPUCAIA",UN:"GMG-UNISINOS",SO:"GMG-SAOLEOPOLDO",RS:"GMG-RIOSINOS",SF:"GMG-SANTOAFONSO",IN:"GMG-INDUSTRIAL",FN:"GMG-FENAC",NH:"GMG-NOVOHAMBURGO",SUB:"GMG-SUBESTACAO2",B1:"GMG-BACIA1",B2:"GMG-BACIA2" };
  const getAssetByCode = (code: string) => assets.find(a => a.tag === CODE_TO_TAG[code]);
  const getVal = (assetId: string, sensor: string) => latest[assetId]?.[sensor]?.value;
  const STEMAC_CODES = new Set(["AP","AN","NT","FT","MV","SL","PB","SC","SO","SUB"]);
  const row1 = STATIONS.slice(0,12);
  const row2 = STATIONS.slice(12,25);

  if (!auth) return (
    <div className="min-h-screen bg-black flex items-center justify-center font-mono" style={{background:"#050505"}}>
      <div className="border border-green-800 rounded p-8 w-80" style={{background:"#0a0a0a"}}>
        <div className="text-center mb-6">
          <div className="text-green-400 text-lg font-bold tracking-widest mb-1">TRENSURB - SENERG</div>
          <div className="text-green-700 text-xs">PAINEL DE MONITORAMENTO CCO</div>
          <div className="text-yellow-500 text-xs mt-2">SISTEMA EM IMPLANTACAO</div>
        </div>
        <div className="mb-4">
          <label className="text-green-600 text-xs block mb-2">SENHA DE ACESSO</label>
          <input type="password" className="w-full bg-black border border-green-800 text-green-400 px-3 py-2 rounded text-sm focus:outline-none focus:border-green-500 font-mono"
            value={senha} onChange={e=>{setSenha(e.target.value);setErroSenha(false);}}
            onKeyDown={e=>{if(e.key==="Enter"){if(senha==="jacao010706"){setAuth(true);}else{setErroSenha(true);setSenha("")}}}}
            placeholder="**********" autoFocus />
          {erroSenha && <p className="text-red-500 text-xs mt-1">Senha incorreta!</p>}
        </div>
        <button onClick={()=>{if(senha==="jacao010706"){setAuth(true);}else{setErroSenha(true);setSenha("");}}}
          className="w-full py-2 border border-green-700 text-green-400 rounded text-sm hover:bg-green-900 transition-colors font-mono">
          ACESSAR
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono overflow-hidden" style={{background:"#050505"}}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-green-900" style={{background:"#080808"}}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/>
          <span className="text-green-400 text-sm font-bold tracking-widest">TRENSURB - SENERG</span>
          <span className="text-green-700 text-xs">SISTEMA DE MONITORAMENTO DE GERADORES</span>
        </div>
        <div className="flex items-center gap-4">
          {loading && <span className="text-yellow-400 text-xs animate-pulse">CARREGANDO...</span>}
          <span className="text-green-600 text-xs">ATUALIZACAO: {lastUpdate||"--:--:--"}</span>
          <button onClick={()=>document.documentElement.requestFullscreen()} className="text-green-600 text-xs hover:text-green-400 border border-green-900 px-2 py-0.5 rounded">TELA CHEIA</button>
          <div className="w-2 h-2 rounded-full bg-green-400"/>
        </div>
      </div>
      <div className="p-2 flex flex-col gap-2 h-[calc(100vh-48px)]">
        {[row1,row2].map((row,rowIdx)=>(
          <div key={rowIdx} className="flex-1 grid gap-2" style={{gridTemplateColumns:"repeat(13,1fr)"}}>
            {row.map((station)=>{
              const asset=getAssetByCode(station.code);
              const assetId=asset?.id;
              const mode=assetId?getVal(assetId,"mode"):undefined;
              const fuel=assetId?getVal(assetId,"fuel_level"):undefined;
              const gridV=assetId?getVal(assetId,"grid_voltage_l1"):undefined;
              const voltL1=assetId?getVal(assetId,"voltage_l1"):undefined;
              const temp=assetId?getVal(assetId,"temperature"):undefined;
              const battery=assetId?getVal(assetId,"battery"):undefined;
              const isRunning=assetId?getVal(assetId,"is_running"):undefined;
              const running=isRunning!=null?isRunning>0:(voltL1!=null&&voltL1>50);
              const isStemac=STEMAC_CODES.has(station.code);
              const typeColor=isStemac?"#00bfff":"#ff8c00";
              const borderColor=running?typeColor:mode===0?"#ffd700":typeColor;
              return (
                <div key={station.code} className="flex flex-col rounded cursor-pointer transition-all hover:brightness-125"
                  style={{border:`1px solid ${borderColor}`,background:"#0a0a0a"}}
                  onClick={()=>setSelected({station,asset})}>
                  <div className="flex items-center justify-between px-2 py-1" style={{background:"#0f0f0f",borderBottom:`1px solid ${borderColor}33`}}>
                    <span className="font-bold" style={{color:borderColor,fontSize:"20px"}}>{station.code}</span>
                    <span className="text-xs" style={{color:borderColor,fontSize:"9px"}}>{mode===1?"AUTO":mode===0?"MAN":"---"}</span>
                    <div className="w-2 h-2 rounded-full" style={{background:running?"#00ff41":mode!=null?"#ffd700":"#333"}}/>
                  </div>
                  <div className="flex items-center justify-center p-1" style={{height:"calc(100% - 48px)"}}>
                    <GeneratorSVG mode={mode} fuelLevel={fuel} gridVoltage={gridV} voltageL1={voltL1} running={running} temp={temp} battery={battery}/>
                  </div>
                  <div className="flex justify-between px-2 py-1 text-xs" style={{borderTop:`1px solid ${borderColor}33`}}>
                    <span style={{color:"#888"}}>{temp!=null?Math.round(Number(temp))+"C":"--"}</span>
                    <span style={{color:"#00cc44"}}>{gridV!=null?Math.round(Number(gridV))+"V":"---"}</span>
                    <span style={{color:fuel>50?"#00aa00":fuel>20?"#ffd700":"#ff0000"}}>{fuel!=null?fuel+"%":"--"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {alerts.length > 0 && (
        <div className="mx-2 mb-2 rounded border border-red-900" style={{background:'#0a0000',maxHeight:'160px',overflowY:'auto'}}>
          <div className="flex items-center gap-2 px-2 py-1 border-b border-red-900">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"/>
            <span className="text-red-400 text-xs font-bold tracking-wider">ALARMES ATIVOS</span>
          </div>
          <div style={{columnCount:3,columnGap:'16px',padding:'4px 8px'}}>
            {Array.from(new Map(alerts.map((a)=>[a.title,a])).values()).map((alert,idx)=>(
              <div key={idx} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:alert.severity==='high'?'#ef4444':'#eab308'}}/>
                <span style={{fontSize:'14px',fontWeight:'bold',color:alert.severity==='high'?'#f87171':'#facc15',whiteSpace:'nowrap'}}>{alert.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {selected&&(
        <DetailPanel
          station={selected.station}
          asset={selected.asset}
          vals={selected.asset?latest[selected.asset.id]||{}:{}}
          onClose={()=>{setSelected(null);setCmdMsg(null);}}
          onCommand={enviarComando}
          cmdLoading={cmdLoading}
          cmdMsg={cmdMsg}
        />
      )}
    </div>
  );
}
