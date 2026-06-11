path = r"C:\Users\jacques.siman\sgm-ferroviario\frontend\src\app\fuel-orders\page.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Adicionar estado para tecnicos
old = '  const [printOrder, setPrintOrder] = useState<any | null>(null);'
new = '  const [printOrder, setPrintOrder] = useState<any | null>(null);\n  const [technicians, setTechnicians] = useState<any[]>([]);'
content = content.replace(old, new)

# Buscar tecnicos ao carregar
old2 = '  useEffect(() => { load(); }, []);'
new2 = '  useEffect(() => {\n    load();\n    api.get("/teams/technicians/").then((r) => setTechnicians(r.data)).catch(() => {});\n  }, []);'
content = content.replace(old2, new2)

# Trocar input de responsible_name por select
old3 = '                  <div className="col-span-3"><label className={lbl}>Nome</label><input className={inp} value={form.responsible_name} onChange={e => setForm({ ...form, responsible_name: e.target.value })} /></div>\n                    <div><label className={lbl}>RE</label><input className={inp} value={form.responsible_re} onChange={e => setForm({ ...form, responsible_re: e.target.value })} /></div>'
new3 = '''                  <div className="col-span-3"><label className={lbl}>Nome</label>
                    <select className={inp} value={form.responsible_name} onChange={e => {
                      const tech = technicians.find((t: any) => t.name === e.target.value);
                      setForm({ ...form, responsible_name: e.target.value, responsible_re: tech?.registration || form.responsible_re });
                    }}>
                      <option value={form.responsible_name}>{form.responsible_name}</option>
                      {technicians.map((t: any) => <option key={t.id} value={t.name}>{t.name} ({t.role || "Tecnico"})</option>)}
                    </select>
                  </div>
                    <div><label className={lbl}>RE</label><input className={inp} value={form.responsible_re} onChange={e => setForm({ ...form, responsible_re: e.target.value })} /></div>'''

if old3 in content:
    content = content.replace(old3, new3)
    print("Passo 1 OK")
else:
    print("ERRO passo 1")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
