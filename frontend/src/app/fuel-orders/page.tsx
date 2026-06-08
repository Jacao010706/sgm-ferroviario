"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import { Plus, RefreshCw, X, Printer, Fuel, Droplets, FileText, ChevronDown, ChevronUp } from "lucide-react";
import clsx from "clsx";

const SHIFT_OPTIONS = ["MANHA", "TARDE", "NOITE"];
const emptyItem = { subitem: "", station: "", forecast_liters: "", supplied_liters: "", ggd_automatic: "" };
const emptyForm = {
  number: "",
  execution_date: new Date().toISOString().split("T")[0],
  location: "Sala do GGD",
  sector: "SENERG",
  shift: "NOITE",
  week: "",
  supplier: "QUERODIESEL TRANSPORTE E COMERCIO DE COMBUSTIVEIS LTDA",
  fiscal_1: "", fiscal_2: "", fiscal_3: "",
  additive_station: "", additive_forecast_ml: "", additive_quantity_ml: "", additive_completed: "",
  observations: "", management_observations: "",
  responsible_name: "Leonardo Costa Santos", responsible_re: "2885",
  employee_1_name: "", employee_1_re: "", employee_2_name: "", employee_2_re: "",
};

function FuelOrdersContent() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<any>({ ...emptyForm });
  const [items, setItems] = useState<any[]>([{ ...emptyItem, subitem: "1.1" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [printOrder, setPrintOrder] = useState<any | null>(null);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);

  const load = () => {
    setLoading(true);
    api.get("/fuel-orders/").then((r) => setOrders(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api.get("/teams/").then((r) => { const all = r.data.flatMap((t: any) => t.members || []); setTechnicians(all); }).catch(() => {});
    api.get("/assets/", { params: { limit: 100 } }).then((r) => setAssets(r.data.filter((a: any) => a.asset_type === "generator"))).catch(() => {});
  }, []);
  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setShowModal(true);
      const station = searchParams.get("station");
      if (station) {
        setItems([{ ...emptyItem, subitem: "1.1", station: station }]);
        setForm((f: any) => ({ ...f, sector: "SENERG" }));
      }
    }
  }, [searchParams]);
  useEffect(() => {
    if (showModal) {
      api.get("/fuel-orders/next-number").then((r) => setForm((f: any) => ({ ...f, number: r.data.number })));
    }
  }, [showModal]);

  const addItem = () => setItems([...items, { ...emptyItem, subitem: `1.${items.length + 1}` }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, value: string) => {
    setItems(items.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  };

  const handleSubmit = async () => {
    if (!form.number || !form.execution_date) { setError("Preencha numero e data"); return; }
    setSaving(true); setError("");
    try {
      const payload = {
        ...form,
        additive_forecast_ml: form.additive_forecast_ml ? parseFloat(form.additive_forecast_ml) : null,
        additive_quantity_ml: form.additive_quantity_ml ? parseFloat(form.additive_quantity_ml) : null,
        execution_date: new Date(form.execution_date).toISOString(),
        items: items.filter(i => i.station).map(i => ({
          ...i,
          forecast_liters: i.forecast_liters ? parseFloat(i.forecast_liters) : null,
          supplied_liters: i.supplied_liters ? parseFloat(i.supplied_liters) : null,
        })),
      };
      await api.post("/fuel-orders/", payload);
      setShowModal(false);
      setForm({ ...emptyForm });
      setItems([{ ...emptyItem, subitem: "1.1" }]);
      load();
    } catch (e: any) {
      const msg = e?.response?.data?.detail || "Erro ao criar OS";
      if (msg === "Credenciais invalidas") {
        setError("Sessao expirada. Faca logout e login novamente.");
      } else {
        setError(msg);
      }
    } finally { setSaving(false); }
  };

  const closeModal = () => {
    setShowModal(false); setError("");
    setForm({ ...emptyForm });
    setItems([{ ...emptyItem, subitem: "1.1" }]);
  };

  const handlePrint = (order: any) => {
    setPrintOrder(order);
  };


  if (printOrder) {
    const o = printOrder;
    const totalFornecido = o.items?.reduce((acc: number, i: any) => acc + (i.supplied_liters || 0), 0) || 0;
    return (
      <div className="p-6" style={{fontFamily: "Arial, sans-serif", fontSize: "10px"}}>
        <style>{`@media print { .no-print { display: none !important; } }`}</style>
        <div className="no-print mb-4 flex gap-2">
          <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded text-sm">Imprimir</button>
          <button onClick={() => setPrintOrder(null)} className="px-4 py-2 border rounded text-sm">Fechar</button>
        </div>
        <div style={{border:"1px solid black",padding:"4px",marginBottom:"4px"}}>
          <div style={{textAlign:"center",fontWeight:"bold",fontSize:"12px"}}>EMPRESA DE TRENS URBANOS DE PORTO ALEGRE S.A</div>
          <div style={{textAlign:"center",fontWeight:"bold"}}>SENERG ENERGIA</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"4px",marginTop:"4px"}}>
            <div><strong>Ordem de Servico Interno N°:</strong> {o.number}</div>
            <div><strong>DATA DA EXECUCAO:</strong> {new Date(o.execution_date).toLocaleDateString("pt-BR")}</div>
            <div><strong>LOCAL:</strong> {o.location}</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"4px",marginTop:"4px"}}>
            <div><strong>SEMANA:</strong> {o.week || "-"}</div>
            <div><strong>SETOR:</strong> {o.sector}</div>
            <div><strong>TURNO:</strong> {o.shift}</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px",marginTop:"4px"}}>
            <div><strong>Fiscal Trensurb (1):</strong> {o.fiscal_1 || "___________________"} <strong>RE:</strong> {o.fiscal_1_re || "______"}</div>
            <div><strong>Fiscal Trensurb (2):</strong> {o.fiscal_2 || "___________________"} <strong>RE:</strong> {o.fiscal_2_re || "______"}</div>
          </div>
          <div style={{marginTop:"4px",fontWeight:"bold"}}>{o.supplier} - FORNECIMENTO DE DIESEL</div>
        </div>
        <div style={{marginBottom:"4px"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:"10px"}}>
            <thead>
              <tr style={{backgroundColor:"#f0f0f0"}}>
                <th style={{border:"1px solid black",padding:"3px",textAlign:"left"}}>Descricao</th>
                <th style={{border:"1px solid black",padding:"3px"}}>Unidade</th>
                <th style={{border:"1px solid black",padding:"3px"}}>Subitem</th>
                <th style={{border:"1px solid black",padding:"3px",textAlign:"left"}}>Equipamentos</th>
                <th style={{border:"1px solid black",padding:"3px"}}>Previsao (L)</th>
                <th style={{border:"1px solid black",padding:"3px"}}>Fornecimento (L)</th>
                <th style={{border:"1px solid black",padding:"3px"}}>GGD automatico?</th>
              </tr>
            </thead>
            <tbody>
              {o.items?.map((item: any, idx: number) => (
                <tr key={idx}>
                  <td style={{border:"1px solid black",padding:"3px"}}>{idx === 0 ? "Fornecimento de oleo diesel S-500 aos grupos geradores a diesel." : ""}</td>
                  <td style={{border:"1px solid black",padding:"3px",textAlign:"center"}}>Litro</td>
                  <td style={{border:"1px solid black",padding:"3px",textAlign:"center"}}>{item.subitem}</td>
                  <td style={{border:"1px solid black",padding:"3px"}}>{item.station}</td>
                  <td style={{border:"1px solid black",padding:"3px",textAlign:"center"}}>{item.forecast_liters || "-"}</td>
                  <td style={{border:"1px solid black",padding:"3px",textAlign:"center"}}>{item.supplied_liters || ""}</td>
                  <td style={{border:"1px solid black",padding:"3px",textAlign:"center"}}>{item.ggd_automatic || ""}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={5} style={{border:"1px solid black",padding:"3px",textAlign:"right",fontWeight:"bold"}}>TOTAL DE LITROS FORNECIDOS:</td>
                <td style={{border:"1px solid black",padding:"3px",textAlign:"center",fontWeight:"bold"}}>{totalFornecido || ""}</td>
                <td style={{border:"1px solid black",padding:"3px"}}></td>
              </tr>
            </tbody>
          </table>
        </div>
        {(o.additive_station || o.additive_forecast_ml) && (
          <div style={{marginBottom:"4px"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:"10px"}}>
              <thead>
                <tr style={{backgroundColor:"#f0f0f0"}}>
                  <th style={{border:"1px solid black",padding:"3px",textAlign:"left"}}>Descricao</th>
                  <th style={{border:"1px solid black",padding:"3px"}}>Unidade</th>
                  <th style={{border:"1px solid black",padding:"3px",textAlign:"left"}}>Equipamentos</th>
                  <th style={{border:"1px solid black",padding:"3px"}}>Previsao (ml)</th>
                  <th style={{border:"1px solid black",padding:"3px"}}>Quantidade (ml)</th>
                  <th style={{border:"1px solid black",padding:"3px"}}>Servico Concluido?</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{border:"1px solid black",padding:"3px"}}>Colocacao de Aditivo.</td>
                  <td style={{border:"1px solid black",padding:"3px",textAlign:"center"}}>ml</td>
                  <td style={{border:"1px solid black",padding:"3px"}}>{o.additive_station}</td>
                  <td style={{border:"1px solid black",padding:"3px",textAlign:"center"}}>{o.additive_forecast_ml}</td>
                  <td style={{border:"1px solid black",padding:"3px",textAlign:"center"}}>{o.additive_quantity_ml}</td>
                  <td style={{border:"1px solid black",padding:"3px",textAlign:"center"}}>{o.additive_completed}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {o.observations && (
          <div style={{border:"1px solid black",padding:"4px",marginBottom:"4px"}}>
            <strong>Apontamento de observacoes:</strong>
            <p style={{marginTop:"2px"}}>{o.observations}</p>
          </div>
        )}
        <div style={{border:"1px solid black",padding:"4px",marginBottom:"4px",fontWeight:"bold"}}>
          CONDICOES DE SEGURANCA: REALIZAR A APR ANTES DO INICIO DAS ATIVIDADES
        </div>
        <div style={{border:"1px solid black",padding:"4px",marginBottom:"4px"}}>
          <div style={{fontWeight:"bold",marginBottom:"4px"}}>EMPREGADOS TRENSURB</div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr>
                <th style={{border:"1px solid black",padding:"3px",textAlign:"left"}}>Nome</th>
                <th style={{border:"1px solid black",padding:"3px"}}>RE</th>
                <th style={{border:"1px solid black",padding:"3px"}}>Assinatura</th>
                <th style={{border:"1px solid black",padding:"3px",textAlign:"left"}}>Nome</th>
                <th style={{border:"1px solid black",padding:"3px"}}>RE</th>
                <th style={{border:"1px solid black",padding:"3px"}}>Assinatura</th>
              </tr>
            </thead>
            <tbody>
              {[0,1,2].map(idx2 => (
                <tr key={idx2} style={{height:"20px"}}>
                  <td style={{border:"1px solid black",padding:"3px"}}>{idx2 === 0 ? (o.employee_1_name || "") : ""}</td>
                  <td style={{border:"1px solid black",padding:"3px"}}>{idx2 === 0 ? (o.employee_1_re || "") : ""}</td>
                  <td style={{border:"1px solid black",padding:"3px"}}></td>
                  <td style={{border:"1px solid black",padding:"3px"}}>{idx2 === 0 ? (o.employee_2_name || "") : ""}</td>
                  <td style={{border:"1px solid black",padding:"3px"}}>{idx2 === 0 ? (o.employee_2_re || "") : ""}</td>
                  <td style={{border:"1px solid black",padding:"3px"}}></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{border:"1px solid black",padding:"4px",marginBottom:"4px"}}>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:"8px"}}>
            <div><strong>Superior responsavel pela area:</strong> {o.responsible_name}</div>
            <div><strong>RE:</strong> {o.responsible_re}</div>
            <div><strong>Contato do CCO:</strong></div>
          </div>
          <div style={{marginTop:"8px"}}>
            <div><strong>Fiscal Trensurb (1):</strong> ___________________________________</div>
            <div style={{marginTop:"4px"}}><strong>Fiscal Trensurb (2):</strong> ___________________________________</div>
            <div style={{marginTop:"4px"}}><strong>Preposto da Contratada:</strong> ___________________________________</div>
          </div>
        </div>
        <div style={{border:"1px solid black",padding:"4px",marginBottom:"4px"}}>
          <strong>OBSERVACOES DA GESTAO / SUPERVISAO</strong>
          <div style={{height:"150px",marginTop:"4px"}}>{o.management_observations}</div>
        </div>
        <div style={{border:"1px solid black",padding:"4px"}}>
          <strong>RESPONSAVEL PELAS OBSERVACOES</strong>
          <table style={{width:"100%",borderCollapse:"collapse",marginTop:"4px"}}>
            <thead>
              <tr>
                <th style={{border:"1px solid black",padding:"3px",textAlign:"left"}}>Nome</th>
                <th style={{border:"1px solid black",padding:"3px"}}>RE</th>
                <th style={{border:"1px solid black",padding:"3px"}}>Data</th>
                <th style={{border:"1px solid black",padding:"3px"}}>Assinatura</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{height:"30px"}}>
                <td style={{border:"1px solid black",padding:"3px"}}></td>
                <td style={{border:"1px solid black",padding:"3px"}}></td>
                <td style={{border:"1px solid black",padding:"3px"}}></td>
                <td style={{border:"1px solid black",padding:"3px"}}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const totalThisMonth = orders.filter(o => {
    const d = new Date(o.execution_date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const totalLiters = orders.reduce((acc, o) => acc + (o.total_supplied || 0), 0);
  const inp = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const lbl = "block text-sm font-medium text-slate-700 mb-1";

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">OS de Abastecimento</h1>
            <p className="text-slate-500 text-sm">Fornecimento de oleo diesel S-500</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <Plus size={15} /> Nova OS
            </button>
            <button onClick={load} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 bg-white">
              <RefreshCw size={15} className="text-slate-500" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-100 p-4 flex gap-3 items-center shadow-sm">
            <div className="p-2 bg-blue-50 rounded-lg"><FileText size={18} className="text-blue-600" /></div>
            <div><p className="text-2xl font-bold text-slate-800">{orders.length}</p><p className="text-xs text-slate-500">Total de OS</p></div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4 flex gap-3 items-center shadow-sm">
            <div className="p-2 bg-green-50 rounded-lg"><Fuel size={18} className="text-green-600" /></div>
            <div><p className="text-2xl font-bold text-slate-800">{totalThisMonth}</p><p className="text-xs text-slate-500">OS este mes</p></div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4 flex gap-3 items-center shadow-sm">
            <div className="p-2 bg-amber-50 rounded-lg"><Droplets size={18} className="text-amber-600" /></div>
            <div><p className="text-2xl font-bold text-slate-800">{totalLiters.toLocaleString("pt-BR")}L</p><p className="text-xs text-slate-500">Total fornecido</p></div>
          </div>
        </div>

        <div className="space-y-3">
          {loading ? (
            <p className="text-center text-slate-400 py-10">Carregando...</p>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Fuel size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400">Nenhuma OS de abastecimento cadastrada</p>
              <button onClick={() => setShowModal(true)} className="mt-4 text-blue-600 text-sm hover:underline">Criar primeira OS</button>
            </div>
          ) : orders.map((o) => (
            <div key={o.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 flex items-center justify-between gap-4 cursor-pointer" onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-blue-50 rounded-lg shrink-0"><Fuel size={16} className="text-blue-600" /></div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800">OS No {o.number}</span>
                      {o.shift && <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">{o.shift}</span>}
                      {o.location && <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">{o.location}</span>}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(o.execution_date).toLocaleDateString("pt-BR")}
                      {o.sector && ` - ${o.sector}`}
                      {o.total_supplied > 0 && ` - ${o.total_supplied.toLocaleString("pt-BR")}L fornecidos`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); handlePrint(o); }} className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 px-2 py-1.5 border border-slate-200 rounded-lg hover:border-blue-200">
                    <Printer size={13} /> Imprimir
                  </button>
                  {expanded === o.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </div>
              </div>

              {expanded === o.id && (
                <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                  {o.items?.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Fornecimento de Diesel S-500</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50">
                              <th className="text-left p-2 border border-slate-100 font-medium text-slate-500">Subitem</th>
                              <th className="text-left p-2 border border-slate-100 font-medium text-slate-500">Estacao</th>
                              <th className="text-right p-2 border border-slate-100 font-medium text-slate-500">Previsao (L)</th>
                              <th className="text-right p-2 border border-slate-100 font-medium text-slate-500">Fornecido (L)</th>
                              <th className="text-center p-2 border border-slate-100 font-medium text-slate-500">GGD Automatico</th>
                            </tr>
                          </thead>
                          <tbody>
                            {o.items.map((item: any, i: number) => (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="p-2 border border-slate-100 text-slate-600">{item.subitem}</td>
                                <td className="p-2 border border-slate-100 text-slate-800">{item.station}</td>
                                <td className="p-2 border border-slate-100 text-right text-slate-600">{item.forecast_liters ?? "-"}</td>
                                <td className="p-2 border border-slate-100 text-right font-medium text-slate-800">{item.supplied_liters ?? "-"}</td>
                                <td className="p-2 border border-slate-100 text-center text-slate-600">{item.ggd_automatic ?? "-"}</td>
                              </tr>
                            ))}
                            <tr className="bg-slate-50 font-semibold">
                              <td colSpan={3} className="p-2 border border-slate-100 text-right text-slate-600 text-xs">Total fornecido:</td>
                              <td className="p-2 border border-slate-100 text-right text-slate-800">{o.total_supplied}L</td>
                              <td className="p-2 border border-slate-100"></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {o.responsible_name && (
                    <div className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                      Superior responsavel: <span className="font-medium text-slate-700">{o.responsible_name}</span> - RE: {o.responsible_re}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-800">Nova OS de Abastecimento</h2>
                <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-3 gap-4">
                  <div><label className={lbl}>No OS *</label><input className={inp} value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} /></div>
                  <div><label className={lbl}>Data *</label><input type="date" className={inp} value={form.execution_date} onChange={e => setForm({ ...form, execution_date: e.target.value })} /></div>
                  <div><label className={lbl}>Semana</label><input className={inp} value={form.week} onChange={e => setForm({ ...form, week: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className={lbl}>Local</label><input className={inp} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
                  <div><label className={lbl}>Setor</label><input className={inp} value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })} /></div>
                  <div><label className={lbl}>Turno</label>
                    <select className={inp} value={form.shift} onChange={e => setForm({ ...form, shift: e.target.value })}>
                      {SHIFT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div><label className={lbl}>Fornecedor</label><input className={inp} value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={lbl}>Fiscal 1</label>
                    <select className={inp} value={form.fiscal_1} onChange={e => setForm({ ...form, fiscal_1: e.target.value })}>
                      <option value="">Selecione</option>
                      {technicians.map((t: any) => <option key={t.id} value={t.name}>{t.name}</option>)}
                    </select>
                  </div>
                  <div><label className={lbl}>Fiscal 2</label>
                    <select className={inp} value={form.fiscal_2} onChange={e => setForm({ ...form, fiscal_2: e.target.value })}>
                      <option value="">Selecione</option>
                      {technicians.map((t: any) => <option key={t.id} value={t.name}>{t.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Aditivo</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div><label className={lbl}>Estacao</label><select className={inp} value={form.additive_station} onChange={e => setForm({ ...form, additive_station: e.target.value })}><option value="">Selecione</option>{assets.map((a: any) => <option key={a.id} value={a.name}>{a.name}</option>)}</select></div>
                    <div><label className={lbl}>Previsao (ml)</label><input type="number" className={inp} value={form.additive_forecast_ml} onChange={e => setForm({ ...form, additive_forecast_ml: e.target.value })} /></div>
                    <div><label className={lbl}>Quantidade (ml)</label><input type="number" className={inp} value={form.additive_quantity_ml} onChange={e => setForm({ ...form, additive_quantity_ml: e.target.value })} /></div>
                  </div>
                  <div className="mt-3"><label className={lbl}>Servico Concluido?</label><select className={inp} value={form.additive_completed} onChange={e => setForm({ ...form, additive_completed: e.target.value })}><option value="">-</option><option value="Sim">Sim</option><option value="Nao">Nao</option></select></div>
                </div>
                <div className="border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-slate-700">Fornecimento de Diesel S-500</p>
                    <button onClick={addItem} className="flex items-center gap-1 text-xs text-blue-600 border border-blue-200 px-2 py-1 rounded-lg"><Plus size={12} /> Adicionar estacao</button>
                  </div>
                  <div className="space-y-2">
                    {items.map((item, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-lg">
                        <div className="col-span-1"><label className="text-xs text-slate-500">Subitem</label><input className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white" value={item.subitem} onChange={e => updateItem(i, "subitem", e.target.value)} /></div>
                        <div className="col-span-4"><label className="text-xs text-slate-500">Estacao *</label><select className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white" value={item.station} onChange={e => updateItem(i, "station", e.target.value)}><option value="">Selecione</option>{assets.map((a: any) => <option key={a.id} value={a.name}>{a.name}</option>)}</select></div>
                        <div className="col-span-2"><label className="text-xs text-slate-500">Previsao (L)</label><select className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white" value={item.forecast_liters} onChange={e => updateItem(i, "forecast_liters", e.target.value)}><option value="">Selecione</option>{Array.from({length: 25}, (_, i) => (i+1)*10).map(v => <option key={v} value={v}>{v}L</option>)}</select></div>
                        <div className="col-span-2"><label className="text-xs text-slate-500">Fornecido (L)</label><input type="number" className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white" value={item.supplied_liters} onChange={e => updateItem(i, "supplied_liters", e.target.value)} /></div>
                        <div className="col-span-2"><label className="text-xs text-slate-500">GGD Auto?</label><select className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white" value={item.ggd_automatic} onChange={e => updateItem(i, "ggd_automatic", e.target.value)}><option value="">-</option><option value="Sim">Sim</option><option value="Nao">Nao</option></select></div>
                        <div className="col-span-1 flex items-end pb-0.5">{items.length > 1 && <button onClick={() => removeItem(i)} className="text-slate-300 hover:text-red-500 mt-4"><X size={14} /></button>}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Superior responsavel</p>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-3"><label className={lbl}>Nome</label>
                    <select className={inp} value={form.responsible_name} onChange={e => {
                      const tech = technicians.find((t: any) => t.name === e.target.value);
                      setForm({ ...form, responsible_name: e.target.value, responsible_re: tech?.badge_number?.toString() || form.responsible_re });
                    }}>
                      <option value={form.responsible_name}>{form.responsible_name}</option>
                      {technicians.map((t: any) => <option key={t.id} value={t.name}>{t.name} ({t.role || "Tecnico"})</option>)}
                    </select>
                  </div>
                    <div><label className={lbl}>RE</label><input className={inp} value={form.responsible_re} onChange={e => setForm({ ...form, responsible_re: e.target.value })} /></div>
                  </div>
                </div>
                <div><label className={lbl}>Observacoes</label><textarea className={inp} rows={2} value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} /></div>
                {error && <p className="text-red-600 text-sm">{error}</p>}
              </div>
              <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
                <button onClick={closeModal} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
                <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">{saving ? "Salvando..." : "Criar OS"}</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function FuelOrdersPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><p className="text-slate-400">Carregando...</p></div>}>
      <FuelOrdersContent />
    </Suspense>
  );
}