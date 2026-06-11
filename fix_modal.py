path = r"C:\Users\jacques.siman\sgm-ferroviario\frontend\src\app\fuel-orders\page.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Trocar setor default de CRP para SENERG
content = content.replace('  sector: "CRP",', '  sector: "SENERG",')

# 2. Adicionar estado para assets (geradores)
old = '  const [technicians, setTechnicians] = useState<any[]>([]);'
new = '  const [technicians, setTechnicians] = useState<any[]>([]);\n  const [assets, setAssets] = useState<any[]>([]);'
content = content.replace(old, new)

# 3. Buscar assets ao carregar
old2 = '    api.get("/teams/").then((r) => { const all = r.data.flatMap((t: any) => t.members || []); setTechnicians(all); }).catch(() => {});'
new2 = '    api.get("/teams/").then((r) => { const all = r.data.flatMap((t: any) => t.members || []); setTechnicians(all); }).catch(() => {});\n    api.get("/assets/", { params: { limit: 100 } }).then((r) => setAssets(r.data.filter((a: any) => a.asset_type === "generator"))).catch(() => {});'
content = content.replace(old2, new2)

# 4. Trocar input estacao por select com geradores
old3 = '                        <div className="col-span-4"><label className="text-xs text-slate-500">Estacao *</label><input className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white" value={item.station} onChange={e => updateItem(i, "station", e.target.value)} /></div>'
new3 = '                        <div className="col-span-4"><label className="text-xs text-slate-500">Estacao *</label><select className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 bg-white" value={item.station} onChange={e => updateItem(i, "station", e.target.value)}><option value="">Selecione</option>{assets.map((a: any) => <option key={a.id} value={a.name}>{a.name}</option>)}</select></div>'
content = content.replace(old3, new3)

# 5. Adicionar secao de aditivo no modal
old4 = '                <div><label className={lbl}>Observacoes</label><textarea className={inp} rows={2} value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} /></div>'
new4 = '''                <div className="border-t border-slate-100 pt-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Aditivo</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div><label className={lbl}>Estacao</label><select className={inp} value={form.additive_station} onChange={e => setForm({ ...form, additive_station: e.target.value })}><option value="">Selecione</option>{assets.map((a: any) => <option key={a.id} value={a.name}>{a.name}</option>)}</select></div>
                    <div><label className={lbl}>Previsao (ml)</label><input type="number" className={inp} value={form.additive_forecast_ml} onChange={e => setForm({ ...form, additive_forecast_ml: e.target.value })} /></div>
                    <div><label className={lbl}>Quantidade (ml)</label><input type="number" className={inp} value={form.additive_quantity_ml} onChange={e => setForm({ ...form, additive_quantity_ml: e.target.value })} /></div>
                  </div>
                  <div className="mt-3"><label className={lbl}>Servico Concluido?</label><select className={inp} value={form.additive_completed} onChange={e => setForm({ ...form, additive_completed: e.target.value })}><option value="">-</option><option value="Sim">Sim</option><option value="Nao">Nao</option></select></div>
                </div>
                <div><label className={lbl}>Observacoes</label><textarea className={inp} rows={2} value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} /></div>'''

if old4 in content:
    content = content.replace(old4, new4)
    print("Passo aditivo OK")
else:
    print("ERRO aditivo")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

checks = ['sector: "SENERG"', 'assets.map', 'Aditivo', 'additive_station']
for c in checks:
    print(f"{'OK' if c in content else 'ERRO'}: {c}")
