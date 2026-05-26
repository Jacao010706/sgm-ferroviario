"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import { Plus, RefreshCw, X, Printer, Fuel, Droplets, FileText, ChevronDown, ChevronUp } from "lucide-react";
import clsx from "clsx";

const SHIFT_OPTIONS = ["MANHÃ", "TARDE", "NOITE"];

const emptyItem = { subitem: "", station: "", forecast_liters: "", supplied_liters: "", ggd_automatic: "" };

const emptyForm = {
  number: "",
  execution_date: new Date().toISOString().split("T")[0],
  location: "Sala do GGD",
  sector: "CRP",
  shift: "NOITE",
  week: "",
  supplier: "QUERODIESEL TRANSPORTE E COMERCIO DE COMBUSTIVEIS LTDA",
  fiscal_1: "",
  fiscal_2: "",
  additive_station: "",
  additive_forecast_ml: "",
  additive_quantity_ml: "",
  additive_completed: "",
  observations: "",
  management_observations: "",
  responsible_name: "Leonardo Costa Santos",
  responsible_re: "2885",
  employee_1_name: "",
  employee_1_re: "",
  employee_2_name: "",
  employee_2_re: "",
};

export default function FuelOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<any>({ ...emptyForm });
  const [items, setItems] = useState<any[]>([{ ...emptyItem, subitem: "1.1" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [printOrder, setPrintOrder] = useState<any | null>(null);

  const load = () => {
    setLoading(true);
    api.get("/fuel-orders/").then((r) => setOrders(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

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
      setError(e?.response?.data?.detail || "Erro ao criar OS");
    } finally { setSaving(false); }
  };

  const closeModal = () => {
    setShowModal(false); setError("");
    setForm({ ...emptyForm });
    setItems([{ ...emptyItem, subitem: "1.1" }]);
  };

  const handlePrint = (order: any) => {
    setPrintOrder(order);
    setTimeout(() => window.print(), 300);
  };

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
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">OS de Abastecimento</h1>
            <p className="text-slate-500 text-sm">Fornecimento de óleo diesel S-500</p>
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

        {/* Cards resumo */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-100 p-4 flex gap-3 items-center shadow-sm">
            <div className="p-2 bg-blue-50 rounded-lg"><FileText size={18} className="text-blue-600" /></div>
            <div><p className="text-2xl font-bold text-slate-800">{orders.length}</p><p className="text-xs text-slate-500">Total de OS</p></div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4 flex gap-3 items-center shadow-sm">
            <div className="p-2 bg-green-50 rounded-lg"><Fuel size={18} className="text-green-600" /></div>
            <div><p className="text-2xl font-bold text-slate-800">{totalThisMonth}</p><p className="text-xs text-slate-500">OS este mês</p></div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4 flex gap-3 items-center shadow-sm">
            <div className="p-2 bg-amber-50 rounded-lg"><Droplets size={18} className="text-amber-600" /></div>
            <div><p className="text-2xl font-bold text-slate-800">{totalLiters.toLocaleString("pt-BR")}L</p><p className="text-xs text-slate-500">Total fornecido</p></div>
          </div>
        </div>

        {/* Lista de OS */}
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
                      <span className="font-semibold text-slate-800">OS Nº {o.number}</span>
                      {o.shift && <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">{o.shift}</span>}
                      {o.location && <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">{o.location}</span>}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(o.execution_date).toLocaleDateString("pt-BR")}
                      {o.sector && ` — ${o.sector}`}
                      {o.total_supplied > 0 && ` — ${o.total_supplied.toLocaleString("pt-BR")}L fornecidos`}
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
                  {/* Itens de fornecimento */}
                  {o.items?.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Fornecimento de Diesel S-500</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50">
                              <th className="text-left p-2 border border-slate-100 font-medium text-slate-500">Subitem</th>
                              <th className="text-left p-2 border border-slate-100 font-medium text-slate-500">Estação</th>
                              <th className="text-right p-2 border border-slate-100 font-medium text-slate-500">Previsão (L)</th>
                              <th className="text-right p-2 border border-slate-100 font-medium text-slate-500">Fornecido (L)</th>
                              <th className="text-center p-2 border border-slate-100 font-medium text-slate-500">GGD Automático</th>
                            </tr>
                          </thead>
                          <tbody>
                            {o.items.map((item: any, i: number) => (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="p-2 border border-slate-100 text-slate-600">{item.subitem}</td>
                                <td className="p-2 border border-slate-100 text-slate-800">{item.station}</td>
                                <td className="p-2 border border-slate-100 text-right text-slate-600">{item.forecast_liters ?? "—"}</td>
                                <td className="p-2 border border-slate-100 text-right font-medium text-slate-800">{item.supplied_liters ?? "—"}</td>
                                <td className="p-2 border border-slate-100 text-center text-slate-600">{item.ggd_automatic ?? "—"}</td>
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

                  {/* Aditivo */}
                  {o.additive_station && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Colocação de Aditivo</p>
                      <div className="bg-slate-50 rounded-lg p-3 text-xs grid grid-cols-2 gap-2">
                        <div><span className="text-slate-500">Estação:</span> <span className="font-medium text-slate-800">{o.additive_station}</span></div>
                        <div><span className="text-slate-500">Previsão:</span> <span className="font-medium">{o.additive_forecast_ml ?? "—"} ml</span></div>
                        <div><span className="text-slate-500">Quantidade:</span> <span className="font-medium">{o.additive_quantity_ml ?? "—"} ml</span></div>
                        <div><span className="text-slate-500">Concluído:</span> <span className="font-medium">{o.additive_completed ?? "—"}</span></div>
                      </div>
                    </div>
                  )}

                  {/* Fiscais e funcionários */}
                  <div className="grid grid-cols-2 gap-4 mb-3 text-xs">
                    {(o.fiscal_1 || o.fiscal_2) && (
                      <div>
                        <p className="font-semibold text-slate-500 uppercase mb-1">Fiscais Trensurb</p>
                        {o.fiscal_1 && <p className="text-slate-700">1. {o.fiscal_1}</p>}
                        {o.fiscal_2 && <p className="text-slate-700">2. {o.fiscal_2}</p>}
                      </div>
                    )}
                    {(o.employee_1_name || o.employee_2_name) && (
                      <div>
                        <p className="font-semibold text-slate-500 uppercase mb-1">Empregados</p>
                        {o.employee_1_name && <p className="text-slate-700">{o.employee_1_name} — RE: {o.employee_1_re}</p>}
                        {o.employee_2_name && <p className="text-slate-700">{o.employee_2_name} — RE: {o.employee_2_re}</p>}
                      </div>
                    )}
                  </div>

                  {o.observations && (
                    <div className="text-xs mb-2">
                      <span className="font-semibold text-slate-500">Observações: </span>
                      <span className="text-slate-700">{o.observations}</span>
                    </div>
                  )}

                  {o.responsible_name && (
                    <div className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                      Superior responsável: <span className="font-medium text-slate-700">{o.responsible_name}</span> — RE: {o.responsible_re}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Modal Nova OS */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-800">Nova OS de Abastecimento</h2>
                <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
              </div>

              <div className="p-6 space-y-5">
                {/* Dados gerais */}
                <div className="grid grid-cols-3 gap-4">
                  <div><label className={lbl}>Nº OS *</label><input className={inp} value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} /></div>
                  <div><label className={lbl}>Data de execução *</label><input type="date" className={inp} value={form.execution_date} onChange={e => setForm({ ...form, execution_date: e.target.value })} /></div>
                  <div><label className={lbl}>Semana</label><input className={inp} value={form.week} onChange={e => setForm({ ...form, week: e.target.value })} placeholder="Ex: 21" /></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className={lbl}>Local</label><input className={inp} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
                  <div><label className={lbl}>Setor / CRP</label><input className={inp} value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })} /></div>
                  <div>
                    <label className={lbl}>Turno</label>
                    <select className={inp} value={form.shift} onChange={e => setForm({ ...form, shift: e.target.value })}>
                      {SHIFT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={lbl}>Fornecedor</label>
                  <input className={inp} value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={lbl}>Fiscal Trensurb (1)</label><input className={inp} value={form.fiscal_1} onChange={e => setForm({ ...form, fiscal_1: e.target.value })} placeholder="Nome do fiscal" /></div>
                  <div><label className={lbl}>Fiscal Trensurb (2)</label><input className={inp} value={form.fiscal_2} onChange={e => setForm({ ...form, fiscal_2: e.target.value })} placeholder="Nome do fiscal" /></div>
                </div>

                {/* Itens de diesel */}
                <div className="border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-slate-700">Fornecimento de Diesel S-500</p>
                    <button onClick={addItem} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 border border-blue-200 px-2 py-1 rounded-lg">
                      <Plus size={12} /> Adicionar estação
                    </button>
                  </div>
                  <div className="space-y-2">
                    {items.map((item, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-lg">
                        <div className="col-span-1"><label className="text-xs text-slate-500">Subitem</label><input className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white" value={item.subitem} onChange={e => updateItem(i, "subitem", e.target.value)} /></div>
                        <div className="col-span-4"><label className="text-xs text-slate-500">Estação *</label><input className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white" value={item.station} onChange={e => updateItem(i, "station", e.target.value)} placeholder="Ex: Estação Farrapos" /></div>
                        <div className="col-span-2"><label className="text-xs text-slate-500">Previsão (L)</label><input type="number" className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white" value={item.forecast_liters} onChange={e => updateItem(i, "forecast_liters", e.target.value)} /></div>
                        <div className="col-span-2"><label className="text-xs text-slate-500">Fornecido (L)</label><input type="number" className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white" value={item.supplied_liters} onChange={e => updateItem(i, "supplied_liters", e.target.value)} /></div>
                        <div className="col-span-2"><label className="text-xs text-slate-500">GGD Automático?</label><input className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white" value={item.ggd_automatic} onChange={e => updateItem(i, "ggd_automatic", e.target.value)} placeholder="Sim/Não" /></div>
                        <div className="col-span-1 flex items-end pb-0.5">{items.length > 1 && <button onClick={() => removeItem(i)} className="text-slate-300 hover:text-red-500 mt-4"><X size={14} /></button>}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Aditivo */}
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Colocação de Aditivo</p>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-2"><label className={lbl}>Estação</label><input className={inp} value={form.additive_station} onChange={e => setForm({ ...form, additive_station: e.target.value })} placeholder="Ex: Estação Farrapos" /></div>
                    <div><label className={lbl}>Previsão (ml)</label><input type="number" className={inp} value={form.additive_forecast_ml} onChange={e => setForm({ ...form, additive_forecast_ml: e.target.value })} /></div>
                    <div><label className={lbl}>Quantidade (ml)</label><input type="number" className={inp} value={form.additive_quantity_ml} onChange={e => setForm({ ...form, additive_quantity_ml: e.target.value })} /></div>
                  </div>
                  <div className="mt-3"><label className={lbl}>Serviço concluído?</label><input className={clsx(inp, "max-w-xs")} value={form.additive_completed} onChange={e => setForm({ ...form, additive_completed: e.target.value })} placeholder="Sim / Não" /></div>
                </div>

                {/* Funcionários */}
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Empregados Trensurb</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2"><label className={lbl}>Nome (1)</label><input className={inp} value={form.employee_1_name} onChange={e => setForm({ ...form, employee_1_name: e.target.value })} /></div>
                      <div><label className={lbl}>RE</label><input className={inp} value={form.employee_1_re} onChange={e => setForm({ ...form, employee_1_re: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2"><label className={lbl}>Nome (2)</label><input className={inp} value={form.employee_2_name} onChange={e => setForm({ ...form, employee_2_name: e.target.value })} /></div>
                      <div><label className={lbl}>RE</label><input className={inp} value={form.employee_2_re} onChange={e => setForm({ ...form, employee_2_re: e.target.value })} /></div>
                    </div>
                  </div>
                </div>

                {/* Observações */}
                <div className="border-t border-slate-100 pt-4">
                  <div><label className={lbl}>Observações do serviço</label><textarea className={inp} rows={2} value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} /></div>
                </div>

                {/* Responsável */}
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Superior responsável</p>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-3"><label className={lbl}>Nome</label><input className={inp} value={form.responsible_name} onChange={e => setForm({ ...form, responsible_name: e.target.value })} /></div>
                    <div><label className={lbl}>RE</label><input className={inp} value={form.responsible_re} onChange={e => setForm({ ...form, responsible_re: e.target.value })} /></div>
                  </div>
                </div>

                {error && <p className="text-red-600 text-sm">{error}</p>}
              </div>

              <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
                <button onClick={closeModal} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
                <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">{saving ? "Salvando..." : "Criar OS"}</button>
              </div>
            </div>
          </div>
        )}

        {/* Print area */}
        {printOrder && (
          <div id="print-area" className="hidden print:block print:fixed print:inset-0 print:bg-white print:p-8 print:text-sm print:text-black">
            <div className="text-center mb-4">
              <p className="font-bold text-base">EMPRESA DE TRENS URBANOS DE PORTO ALEGRE S.A.</p>
              <p className="text-sm">{printOrder.supplier}</p>
            </div>
            <div className="grid grid-cols-3 border border-black mb-3">
              <div className="border-r border-black p-2"><span className="font-bold">OS Nº:</span> {printOrder.number}</div>
              <div className="border-r border-black p-2"><span className="font-bold">Data:</span> {new Date(printOrder.execution_date).toLocaleDateString("pt-BR")}</div>
              <div className="p-2"><span className="font-bold">Local:</span> {printOrder.location}</div>
            </div>
            <div className="grid grid-cols-3 border border-black border-t-0 mb-3">
              <div className="border-r border-black p-2"><span className="font-bold">Setor:</span> {printOrder.sector}</div>
              <div className="border-r border-black p-2"><span className="font-bold">Turno:</span> {printOrder.shift}</div>
              <div className="p-2"><span className="font-bold">Semana:</span> {printOrder.week}</div>
            </div>
            <table className="w-full border-collapse border border-black mb-3 text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black p-1 text-left">Descrição</th>
                  <th className="border border-black p-1">Unidade</th>
                  <th className="border border-black p-1">Subitem</th>
                  <th className="border border-black p-1">Equipamento</th>
                  <th className="border border-black p-1">Previsão (L)</th>
                  <th className="border border-black p-1">Fornecimento (L)</th>
                  <th className="border border-black p-1">GGD Automático?</th>
                </tr>
              </thead>
              <tbody>
                {printOrder.items?.map((item: any, i: number) => (
                  <tr key={i}>
                    <td className="border border-black p-1">Fornecimento de óleo diesel S-500</td>
                    <td className="border border-black p-1 text-center">Litro</td>
                    <td className="border border-black p-1 text-center">{item.subitem}</td>
                    <td className="border border-black p-1">{item.station}</td>
                    <td className="border border-black p-1 text-right">{item.forecast_liters ?? ""}</td>
                    <td className="border border-black p-1 text-right">{item.supplied_liters ?? ""}</td>
                    <td className="border border-black p-1 text-center">{item.ggd_automatic ?? ""}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={5} className="border border-black p-1 text-right font-bold">Total de litros fornecidos:</td>
                  <td className="border border-black p-1 text-right font-bold">{printOrder.total_supplied}</td>
                  <td className="border border-black p-1"></td>
                </tr>
              </tbody>
            </table>
            <div className="grid grid-cols-2 border border-black mb-3">
              <div className="border-r border-black p-2 text-xs">
                <p className="font-bold mb-1">Empregados Trensurb</p>
                <p>Nome: {printOrder.employee_1_name} &nbsp;&nbsp; RE: {printOrder.employee_1_re}</p>
                <p className="mt-4 border-t border-black pt-1">Assinatura: _________________</p>
              </div>
              <div className="p-2 text-xs">
                <p className="font-bold mb-1">&nbsp;</p>
                <p>Nome: {printOrder.employee_2_name} &nbsp;&nbsp; RE: {printOrder.employee_2_re}</p>
                <p className="mt-4 border-t border-black pt-1">Assinatura: _________________</p>
              </div>
            </div>
            <div className="border border-black p-2 text-xs mb-2">
              <p className="font-bold">Apontamento de observações:</p>
              <p className="mt-1 min-h-[40px]">{printOrder.observations}</p>
            </div>
            <div className="grid grid-cols-2 border border-black text-xs">
              <div className="border-r border-black p-2">
                <p>Superior responsável: {printOrder.responsible_name} &nbsp; RE: {printOrder.responsible_re}</p>
              </div>
              <div className="p-2">
                <p>Fiscal Trensurb (1): {printOrder.fiscal_1}</p>
                <p>Fiscal Trensurb (2): {printOrder.fiscal_2}</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
