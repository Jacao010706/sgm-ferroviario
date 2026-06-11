path = r"C:\Users\jacques.siman\sgm-ferroviario\frontend\src\app\work-orders\[id]\page.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Adicionar estados
old = '  const [showImportModal, setShowImportModal] = useState(false);'
new = '  const [showImportModal, setShowImportModal] = useState(false);\n  const [showAPR, setShowAPR] = useState(false);\n  const [aprSelections, setAprSelections] = useState<Record<string, boolean>>({});\n  const toggleAPR = (key: string) => setAprSelections(prev => ({ ...prev, [key]: !prev[key] }));'
content = content.replace(old, new)

# 2. Botao APR no topo
old = '            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium transition-colors">\n              <Printer size={15} /> Imprimir OS\n            </button>'
new = '            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium transition-colors">\n              <Printer size={15} /> Imprimir OS\n            </button>\n            <button onClick={() => setShowAPR(true)} className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors">\n              <Printer size={15} /> Imprimir APR\n            </button>'
content = content.replace(old, new)

# 3. Botao APR no rodape
old = '          <button onClick={handlePrint} className="flex items-center gap-2 px-5 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-sm font-medium">\n            <Printer size={15} /> Imprimir OS\n          </button>'
new = '          <button onClick={handlePrint} className="flex items-center gap-2 px-5 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-sm font-medium">\n            <Printer size={15} /> Imprimir OS\n          </button>\n          <button onClick={() => setShowAPR(true)} className="flex items-center gap-2 px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium">\n            <Printer size={15} /> Imprimir APR\n          </button>'
content = content.replace(old, new)

checks = ["showAPR" in content, "aprSelections" in content, "toggleAPR" in content]
if all(checks):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK")
else:
    print("ERRO - checks:", checks)
