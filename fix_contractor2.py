path = r"C:\Users\jacques.siman\sgm-ferroviario\frontend\src\app\work-orders\[id]\page.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Adicionar funcao handleCreateCompany antes do return principal
old = '  const checklistDone = checklist.filter(i => i.done).length;'
new = '''  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) return;
    setSavingCompany(true);
    try {
      const res = await api.post("/contracted-companies/", { name: newCompanyName.trim(), cnpj: newCompanyCnpj.trim() || null });
      setCompanies(prev => [...prev, res.data]);
      setForm((prev: any) => ({ ...prev, contractor_name: res.data.name }));
      setNewCompanyName("");
      setNewCompanyCnpj("");
      setShowCompanyModal(false);
      setMsg("Empresa cadastrada e selecionada!");
      setTimeout(() => setMsg(""), 3000);
    } catch { setMsg("Erro ao cadastrar empresa"); } finally { setSavingCompany(false); }
  };

  const checklistDone = checklist.filter(i => i.done).length;'''
content = content.replace(old, new)

# Adicionar modal de empresas antes do fechamento do main
old = '        {showImportModal && ('
new = '''        {showCompanyModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Building2 size={18} className="text-blue-600" /> Empresas Terceirizadas</h2>
                <button onClick={() => setShowCompanyModal(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4">
                {/* Lista de empresas cadastradas */}
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase mb-2">Selecionar empresa cadastrada</p>
                  {companies.length === 0 ? (
                    <p className="text-slate-400 text-sm py-2">Nenhuma empresa cadastrada ainda.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {companies.map(c => (
                        <button key={c.id} type="button"
                          onClick={() => { setForm((prev: any) => ({ ...prev, contractor_name: c.name })); setShowCompanyModal(false); }}
                          className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm text-slate-800">{c.name}</span>
                            {c.cnpj && <span className="text-xs text-slate-400">{c.cnpj}</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Cadastrar nova empresa */}
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-medium text-slate-500 uppercase mb-3">Cadastrar nova empresa</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Nome da empresa</label>
                      <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)} placeholder="Razao social ou nome fantasia" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">CNPJ (opcional)</label>
                      <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={newCompanyCnpj} onChange={e => setNewCompanyCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 p-6 border-t border-slate-200">
                <button type="button" onClick={() => setShowCompanyModal(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
                <button type="button" onClick={handleCreateCompany} disabled={!newCompanyName.trim() || savingCompany}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
                  {savingCompany ? "Salvando..." : "Cadastrar e Selecionar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showImportModal && ('''
content = content.replace(old, new)

if "handleCreateCompany" in content and "showCompanyModal" in content:
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK")
else:
    print("ERRO")
