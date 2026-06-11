path = r"C:\Users\jacques.siman\sgm-ferroviario\frontend\src\app\work-orders\[id]\page.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Adicionar Building2 no import de icones
old = 'import { ArrowLeft, Save, CheckCircle, Camera, Trash2, Plus, X, ClipboardList, Package, Download, Printer, Fuel } from "lucide-react";'
new = 'import { ArrowLeft, Save, CheckCircle, Camera, Trash2, Plus, X, ClipboardList, Package, Download, Printer, Fuel, Building2, User, ChevronDown } from "lucide-react";'
content = content.replace(old, new)

# 2. Adicionar interface ContractedCompany e estado
old = 'interface ChecklistItem { id: string; text: string; done: boolean; }'
new = '''interface ChecklistItem { id: string; text: string; done: boolean; }
interface ContractedCompany { id: number; name: string; cnpj?: string; }'''
content = content.replace(old, new)

# 3. Adicionar estados para empresas e modal
old = '  const [showImportModal, setShowImportModal] = useState(false);'
new = '''  const [showImportModal, setShowImportModal] = useState(false);
  const [companies, setCompanies] = useState<ContractedCompany[]>([]);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyCnpj, setNewCompanyCnpj] = useState("");
  const [savingCompany, setSavingCompany] = useState(false);'''
content = content.replace(old, new)

# 4. Adicionar contractor_preposto no form state inicial
old = '        contractor_name: o.contractor_name || "",\n        contractor_document: o.contractor_document || "",'
new = '        contractor_name: o.contractor_name || "",\n        contractor_document: o.contractor_document || "",\n        contractor_preposto: o.contractor_preposto || "",'
content = content.replace(old, new)

# 5. Buscar empresas no useEffect
old = '    }).catch(console.error).finally(() => setLoading(false));'
new = '''    }).catch(console.error).finally(() => setLoading(false));
    api.get("/contracted-companies/").then(r => setCompanies(r.data)).catch(() => {});'''
content = content.replace(old, new)

# 6. Adicionar contractor_preposto no handleSave
old = '      if (!payload.contractor_document) delete payload.contractor_document;'
new = '''      if (!payload.contractor_document) delete payload.contractor_document;
      if (!payload.contractor_preposto) delete payload.contractor_preposto;'''
content = content.replace(old, new)

# 7. Substituir secao Execucao (empresa + cnpj) pelo novo layout
old = '''          <div className="grid grid-cols-2 gap-4">
            <div><label className={lbl}>Empresa Terceirizada</label><input className={inp} value={form.contractor_name} onChange={e => setForm({ ...form, contractor_name: e.target.value })} placeholder="Nome da empresa" /></div>
            <div><label className={lbl}>CNPJ</label><input className={inp} value={form.contractor_document} onChange={e => setForm({ ...form, contractor_document: e.target.value })} placeholder="00.000.000/0000-00" /></div>
          </div>'''
new = '''          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Empresa Terceirizada</label>
              <div className="flex gap-2">
                <input className={inp} value={form.contractor_name} onChange={e => setForm({ ...form, contractor_name: e.target.value })} placeholder="Nome da empresa" />
                <button type="button" onClick={() => setShowCompanyModal(true)} title="Selecionar empresa cadastrada" className="flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-slate-600 transition-colors">
                  <Building2 size={15} /><ChevronDown size={12} />
                </button>
              </div>
            </div>
            <div>
              <label className={lbl}>Tecnico Preposto</label>
              <div className="flex gap-2 items-center">
                <User size={15} className="text-slate-400 shrink-0" />
                <input className={inp} value={form.contractor_preposto || ""} onChange={e => setForm({ ...form, contractor_preposto: e.target.value })} placeholder="Nome e funcao do preposto" />
              </div>
            </div>
          </div>'''
content = content.replace(old, new)

# 8. Corrigir print - remover CNPJ, adicionar Preposto
old = '''            <div className="print-field"><label>Empresa Terceirizada</label><span>{form.contractor_name || <span className="empty">Nao informado</span>}</span></div>
            <div className="print-field"><label>CNPJ</label><span>{form.contractor_document || <span className="empty">Nao informado</span>}</span></div>'''
new = '''            <div className="print-field"><label>Empresa Terceirizada</label><span>{form.contractor_name || <span className="empty">Nao informado</span>}</span></div>
            <div className="print-field"><label>Tecnico Preposto</label><span>{form.contractor_preposto || <span className="empty">Nao informado</span>}</span></div>'''
content = content.replace(old, new)

if "showCompanyModal" in content and "Building2" in content:
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK")
else:
    print("ERRO - substituicoes nao encontradas")
