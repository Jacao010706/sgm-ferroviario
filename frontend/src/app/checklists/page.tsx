"use client";
import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import { Plus, RefreshCw, X, ClipboardList, Pencil, Trash2, Download, Upload, FileText } from "lucide-react";
import clsx from "clsx";
import * as XLSX from "xlsx";

const CATEGORIES = ["Gerador", "Transformador", "Subestacao", "Retificador", "Geral", "Outro"];
const emptyForm = { name: "", description: "", category: "", items: [] as string[] };

export default function ChecklistsPage() {
  const [checklists, setChecklists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ ...emptyForm });
  const [newItem, setNewItem] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedImport, setSelectedImport] = useState<string>("");
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [fileImportMsg, setFileImportMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    api.get("/checklists/", { params: { category: categoryFilter || undefined } })
      .then((r) => setChecklists(r.data))
      .catch(() => setChecklists([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [categoryFilter]);

  const openCreate = () => {
    setEditing(null); setForm({ ...emptyForm }); setNewItem(""); setError(""); setFileImportMsg(""); setShowModal(true);
  };

  const openEdit = (c: any) => {
    setEditing(c);
    setForm({ name: c.name, description: c.description || "", category: c.category || "", items: c.items.map((i: any) => i.text || i) });
    setNewItem(""); setError(""); setFileImportMsg(""); setShowModal(true);
  };

  const addItem = () => {
    if (!newItem.trim()) return;
    setForm((prev: any) => ({ ...prev, items: [...prev.items, newItem.trim()] }));
    setNewItem("");
  };

  const removeItem = (idx: number) => {
    setForm((prev: any) => ({ ...prev, items: prev.items.filter((_: any, i: number) => i !== idx) }));
  };

  const handleImportItems = () => {
    const source = checklists.find(c => c.id === selectedImport);
    if (!source) return;
    const newItems = source.items.map((i: any) => i.text || i);
    if (importMode === "replace") setForm((prev: any) => ({ ...prev, items: newItems }));
    else setForm((prev: any) => ({ ...prev, items: [...prev.items, ...newItems] }));
    setShowImportModal(false);
    setSelectedImport("");
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileImportMsg("");
    const ext = file.name.split(".").pop()?.toLowerCase();

    const processLines = (lines: string[]) => {
      const items = lines.map(l => l.trim()).filter(l => l.length > 0);
      if (items.length === 0) { setFileImportMsg("Nenhuma tarefa encontrada no arquivo."); return; }
      setForm((prev: any) => ({ ...prev, items: [...prev.items, ...items] }));
      setFileImportMsg(`${items.length} tarefa(s) importada(s) do arquivo!`);
      setTimeout(() => setFileImportMsg(""), 4000);
    };

    if (ext === "txt" || ext === "csv") {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const lines = ext === "csv"
          ? text.split("\n").map(l => l.split(",")[0].replace(/"/g, ""))
          : text.split("\n");
        processLines(lines);
      };
      reader.readAsText(file);
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = new Uint8Array(ev.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          const lines = rows.map((row: any[]) => String(row[0] || "")).filter(l => l.trim());
          processLines(lines);
        } catch {
          setFileImportMsg("Erro ao ler o arquivo Excel.");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setFileImportMsg("Formato nao suportado. Use .txt, .csv ou .xlsx");
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("Informe o nome do checklist"); return; }
    if (form.items.length === 0) { setError("Adicione pelo menos uma tarefa"); return; }
    setSaving(true); setError("");
    try {
      if (editing) await api.patch(`/checklists/${editing.id}`, form);
      else await api.post("/checklists/", form);
      setShowModal(false); setForm({ ...emptyForm }); setEditing(null); load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Erro ao salvar checklist");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este checklist?")) return;
    await api.delete(`/checklists/${id}`).catch(() => {});
    load();
  };

  const closeModal = () => {
    setShowModal(false); setEditing(null); setForm({ ...emptyForm }); setNewItem(""); setError(""); setFileImportMsg("");
  };

  const inp = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  const lbl = "block text-sm font-medium text-slate-700 mb-1";

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Checklists</h1>
            <p className="text-slate-500 text-sm">Templates reutilizaveis para ordens de servico</p>
          </div>
          <div className="flex gap-2">
            <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <Plus size={15} /> Novo Checklist
            </button>
            <button onClick={load} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 bg-white">
              <RefreshCw size={15} className="text-slate-500" />
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          <button onClick={() => setCategoryFilter("")} className={clsx("px-3 py-1.5 rounded-full text-sm font-medium transition-colors", !categoryFilter ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50")}>Todos</button>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategoryFilter(cat === categoryFilter ? "" : cat)} className={clsx("px-3 py-1.5 rounded-full text-sm font-medium transition-colors", categoryFilter === cat ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50")}>{cat}</button>
          ))}
        </div>

        {loading ? (
          <p className="text-center text-slate-400 py-10">Carregando...</p>
        ) : checklists.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <ClipboardList size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400 mb-4">Nenhum checklist cadastrado</p>
            <button onClick={openCreate} className="text-blue-600 text-sm hover:underline">Criar primeiro checklist</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {checklists.map((c) => (
              <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-800 truncate">{c.name}</h3>
                    {c.category && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{c.category}</span>}
                  </div>
                  <div className="flex gap-1 ml-2 shrink-0">
                    <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600"><Pencil size={13} /></button>
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-500"><Trash2 size={13} /></button>
                  </div>
                </div>
                {c.description && <p className="text-xs text-slate-500 mb-3">{c.description}</p>}
                <div className="space-y-1">
                  {c.items.slice(0, 5).map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                      <div className="w-3.5 h-3.5 border border-slate-300 rounded shrink-0" />
                      <span>{item.text || item}</span>
                    </div>
                  ))}
                  {c.items.length > 5 && <p className="text-xs text-slate-400 pl-5">+{c.items.length - 5} tarefas</p>}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400">{c.items.length} tarefa{c.items.length !== 1 ? "s" : ""}</span>
                  <span className="text-xs text-slate-400">{new Date(c.created_at).toLocaleDateString("pt-BR")}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal criar/editar */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-800">{editing ? "Editar Checklist" : "Novo Checklist"}</h2>
                <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div><label className={lbl}>Nome *</label><input className={inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Manutencao Preventiva Gerador" /></div>
                <div><label className={lbl}>Descricao</label><textarea className={inp} rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Descricao do checklist..." /></div>
                <div>
                  <label className={lbl}>Categoria</label>
                  <select className={inp} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    <option value="">Sem categoria</option>
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-slate-700">
                      Tarefas * <span className="font-normal text-slate-400">({form.items.length} adicionadas)</span>
                    </p>
                    <div className="flex gap-2">
                      {/* Botao importar de arquivo */}
                      <label className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium cursor-pointer">
                        <Upload size={12} /> Importar arquivo
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".txt,.csv,.xlsx,.xls"
                          className="hidden"
                          onChange={handleFileImport}
                        />
                      </label>
                      {/* Botao importar de checklist */}
                      {checklists.filter(c => !editing || c.id !== editing.id).length > 0 && (
                        <button type="button" onClick={() => setShowImportModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium">
                          <Download size={12} /> Importar checklist
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Info formatos suportados */}
                  <div className="bg-slate-50 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
                    <FileText size={13} className="text-slate-400 shrink-0" />
                    <p className="text-xs text-slate-500">Formatos aceitos: <strong>.txt</strong>, <strong>.csv</strong>, <strong>.xlsx</strong> — uma tarefa por linha/célula</p>
                  </div>

                  {fileImportMsg && (
                    <div className={clsx("px-3 py-2 rounded-lg text-xs font-medium mb-3", fileImportMsg.includes("Erro") || fileImportMsg.includes("nao") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700")}>
                      {fileImportMsg}
                    </div>
                  )}

                  <div className="space-y-1 mb-3 max-h-48 overflow-y-auto">
                    {form.items.map((item: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg">
                        <span className="text-xs text-slate-400 w-5 text-right shrink-0">{i + 1}.</span>
                        <span className="text-sm flex-1">{item}</span>
                        <button type="button" onClick={() => removeItem(i)} className="text-slate-300 hover:text-red-500 shrink-0"><X size={13} /></button>
                      </div>
                    ))}
                    {form.items.length === 0 && <p className="text-slate-400 text-sm py-2 text-center">Nenhuma tarefa adicionada ainda</p>}
                  </div>
                  <div className="flex gap-2">
                    <input
                      className={clsx(inp, "flex-1")}
                      value={newItem}
                      onChange={e => setNewItem(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addItem(); }}}
                      placeholder="Nova tarefa... (Enter para adicionar)"
                    />
                    <button type="button" onClick={addItem} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"><Plus size={14} /></button>
                  </div>
                </div>

                {error && <p className="text-red-600 text-sm">{error}</p>}
              </div>
              <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
                <button type="button" onClick={closeModal} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
                <button type="button" onClick={handleSubmit} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
                  {saving ? "Salvando..." : editing ? "Salvar" : "Criar Checklist"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal importar de checklist existente */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Download size={18} className="text-indigo-600" /> Importar de Checklist
                </h2>
                <button onClick={() => setShowImportModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className={lbl}>Selecione o checklist de origem</label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {checklists.filter(c => !editing || c.id !== editing.id).map(c => (
                      <button key={c.id} type="button" onClick={() => setSelectedImport(c.id)}
                        className={clsx("w-full text-left p-3 rounded-xl border transition-all", selectedImport === c.id ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50")}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm text-slate-800">{c.name}</span>
                          <span className="text-xs text-slate-400">{c.items.length} tarefas</span>
                        </div>
                        {c.category && <span className="text-xs text-indigo-600">{c.category}</span>}
                      </button>
                    ))}
                  </div>
                </div>
                {form.items.length > 0 && (
                  <div>
                    <label className={lbl}>Modo de importacao</label>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setImportMode("append")} className={clsx("flex-1 py-2 rounded-lg border text-sm transition-all", importMode === "append" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50")}>Adicionar ao existente</button>
                      <button type="button" onClick={() => setImportMode("replace")} className={clsx("flex-1 py-2 rounded-lg border text-sm transition-all", importMode === "replace" ? "border-red-400 bg-red-50 text-red-700" : "border-slate-200 text-slate-600 hover:bg-slate-50")}>Substituir tudo</button>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
                <button type="button" onClick={() => setShowImportModal(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
                <button type="button" onClick={handleImportItems} disabled={!selectedImport} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">Importar Tarefas</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
