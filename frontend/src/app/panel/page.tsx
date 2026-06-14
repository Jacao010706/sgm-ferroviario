"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

const DSE_IMAGE = "data:image/png;base64,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";

function GeneratorSVG({ mode, fuelLevel, gridVoltage, voltageL1, running, temp, battery }: { mode: any, fuelLevel: any, gridVoltage: any, voltageL1: any, running: boolean, temp: any, battery: any }) {
  const color = running ? "#ff3333" : "#4488ff";
  const fuel = fuelLevel ?? 0;
  const fuelColor = fuel > 50 ? "#00aa00" : fuel > 20 ? "#ffd700" : "#ff0000";
  return (
    <svg viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <rect width="200" height="280" fill="#0a0a0a" rx="4"/>
      <image href={DSE_IMAGE} x="29" y="2" width="142" height="210" style={{filter: running ? "hue-rotate(200deg) saturate(2) brightness(1.3)" : "saturate(0.6) brightness(0.7)"}}/>
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
            <div className="text-green-400 font-bold text-base tracking-widest">{station.code} &mdash; {station.name}</div>
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
              <div key={l} className="rounded p-2 text-center" style={{background:"#001a00",border:}}>
                <div className="text-xs" style={{color}}>{l} Tensao</div>
                <div className="font-bold text-sm" style={{color}}>{running ? fmt(v(k),"V",0) : "0 V"}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {([["I1","current_l1"],["I2","current_l2"],["I3","current_l3"]] as [string,string][]).map(([l,k]) => (
              <div key={l} className="rounded p-2 text-center" style={{background:"#001a00",border:}}>
                <div className="text-xs" style={{color}}>{l} Corrente</div>
                <div className="font-bold text-sm" style={{color}}>{running ? fmt(v(k),"A",0) : "0 A"}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div className="rounded p-2" style={{background:"#0a1a00",border:}}>
            <div className="text-xs text-green-600 mb-1">POTENCIA</div>
            <Row label="kW" val={fmt(v("power_kw"),"kW")} />
            <Row label="kVA" val={fmt(v("power_kva"),"kVA")} />
            <Row label="kVAr" val={fmt(v("power_kvar"),"kVAr")} />
            <Row label="Fator P" val={fmt(v("power_factor"),"",2)} />
          </div>
          <div className="rounded p-2" style={{background:"#0a1a00",border:}}>
            <div className="text-xs text-green-600 mb-1">MEDICOES</div>
            <Row label="Frequencia" val={fmt(v("frequency"),"Hz")} />
            <Row label="Temperatura" val={fmt(v("temperature"),"C",0)} color={temp>80?"#ff4444":"#00ff41"} />
            <Row label="Bateria" val={fmt(v("battery"),"V")} />
            <Row label="Horas" val={fmt(v("runtime_hours"),"h",0)} />
          </div>
        </div>
        <div className="mb-3 rounded p-2" style={{background:"#0a1a00",border:}}>
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
          {cmdMsg && <div className={}>{cmdMsg.text}</div>}
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
                  <div className="flex-1 flex items-center justify-center p-1">
                    <GeneratorSVG mode={mode} fuelLevel={fuel} gridVoltage={gridV} voltageL1={voltL1} running={running} temp={temp} battery={battery}/>
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
