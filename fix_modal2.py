path = r"C:\Users\jacques.siman\sgm-ferroviario\frontend\src\app\fuel-orders\page.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remover secao aditivo do lugar atual (antes de Observacoes)
old_aditivo = '''                <div className="border-t border-slate-100 pt-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Aditivo</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div><label className={lbl}>Estacao</label><select className={inp} value={form.additive_station} onChange={e => setForm({ ...form, additive_station: e.target.value })}><option value="">Selecione</option>{assets.map((a: any) => <option key={a.id} value={a.name}>{a.name}</option>)}</select></div>
                    <div><label className={lbl}>Previsao (ml)</label><input type="number" className={inp} value={form.additive_forecast_ml} onChange={e => setForm({ ...form, additive_forecast_ml: e.target.value })} /></div>
                    <div><label className={lbl}>Quantidade (ml)</label><input type="number" className={inp} value={form.additive_quantity_ml} onChange={e => setForm({ ...form, additive_quantity_ml: e.target.value })} /></div>
                  </div>
                  <div className="mt-3"><label className={lbl}>Servico Concluido?</label><select className={inp} value={form.additive_completed} onChange={e => setForm({ ...form, additive_completed: e.target.value })}><option value="">-</option><option value="Sim">Sim</option><option value="Nao">Nao</option></select></div>
                </div>
                <div><label className={lbl}>Observacoes</label><textarea className={inp} rows={2} value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} /></div>'''

new_aditivo = '                <div><label className={lbl}>Observacoes</label><textarea className={inp} rows={2} value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} /></div>'

content = content.replace(old_aditivo, new_aditivo)

# 2. Substituir fiscais texto por dropdowns de tecnicos + adicionar aditivo antes do superior responsavel
old_fiscais = '''                <div className="grid grid-cols-3 gap-4">
                  <div><label className={lbl}>Fiscal 1</label><input className={inp} value={form.fiscal_1} onChange={e => setForm({ ...form, fiscal_1: e.target.value })} /></div>
                  <div><label className={lbl}>Fiscal 2</label><input className={inp} value={form.fiscal_2} onChange={e => setForm({ ...form, fiscal_2: e.target.value })} /></div>
                  <div><label className={lbl}>Fiscal 3</label><input className={inp} value={form.fiscal_3} onChange={e => setForm({ ...form, fiscal_3: e.target.value })} /></div>
                </div>'''

new_fiscais = '''                <div className="grid grid-cols-2 gap-4">
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
                </div>'''

if old_fiscais in content:
    content = content.replace(old_fiscais, new_fiscais)
    print("OK")
else:
    print("ERRO")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
