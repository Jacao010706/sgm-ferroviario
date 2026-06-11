path = r"C:\Users\jacques.siman\sgm-ferroviario\frontend\src\app\work-orders\[id]\page.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Adicionar estado aprSelections
old = '  const [showAPR, setShowAPR] = useState(false);'
new = '''  const [showAPR, setShowAPR] = useState(false);
  const [aprSelections, setAprSelections] = useState<Record<string, boolean>>({});
  const toggleAPR = (key: string) => setAprSelections(prev => ({ ...prev, [key]: !prev[key] }));'''
content = content.replace(old, new)

# 2. Substituir o modal APR inteiro
old = '        {showAPR && ('
end_marker = '        {showCompanyModal && ('
start_idx = content.index('        {showAPR && (')
end_idx = content.index('        {showCompanyModal && (')
apr_block = content[start_idx:end_idx]

new_apr = '''        {showAPR && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-800">APR / Check-List de Segurança</h2>
                <div className="flex gap-2">
                  <button onClick={() => {
                    const el = document.getElementById("apr-print-area");
                    if (el) { el.style.display = "block"; setTimeout(() => { window.print(); el.style.display = "none"; }, 100); }
                  }} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium">
                    <Printer size={14} /> Imprimir APR
                  </button>
                  <button onClick={() => setShowAPR(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
                </div>
              </div>

              {/* AREA INTERATIVA - selecionar antes de imprimir */}
              <div className="p-6 space-y-4">

                {/* EPIs */}
                <div>
                  <h3 className="font-semibold text-slate-700 text-sm mb-2">Equipamentos de Segurança / EPIs</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {["Capacete de segurança","Protetor facial verde","Óculos de proteção","Protetor auditivo","Respirador","Perneira","Tapete isolante","Vara de manobra","Detector de tensão","Aterramento temporário","Fitas/cones","Rádio comunicador"].map(epi => (
                      <label key={epi} className={clsx("flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm transition-all", aprSelections[`epi_${epi}`] ? "border-orange-400 bg-orange-50 text-orange-800" : "border-slate-200 hover:border-slate-300")}>
                        <input type="checkbox" checked={!!aprSelections[`epi_${epi}`]} onChange={() => toggleAPR(`epi_${epi}`)} className="accent-orange-500" />
                        {epi}
                      </label>
                    ))}
                  </div>
                </div>

                {/* RISCOS */}
                <div>
                  <h3 className="font-semibold text-slate-700 text-sm mb-2">Riscos Identificados</h3>
                  <div className="space-y-3">
                    {[
                      {key:"eletrico", titulo:"Riscos Elétricos", itens:["Contato com partes energizadas","Arco elétrico / flash elétrico","Indução eletromagnética","Eletricidade estática"]},
                      {key:"queda", titulo:"Riscos de Queda", itens:["Queda de mesmo nível","Queda de nível diferente","Queda de objetos/ferramentas"]},
                      {key:"incendio", titulo:"Riscos de Incêndio/Explosão", itens:["Presença de gases inflamáveis","Curto circuito / faíscas","Materiais combustíveis no local"]},
                      {key:"mecanico", titulo:"Riscos Mecânicos", itens:["Contato com partes móveis de máquinas","Ferramentas inadequadas ou defeituosas","Projeção de partículas/fragmentos"]},
                      {key:"ergonomico", titulo:"Riscos Ergonômicos", itens:["Postura inadequada em estruturas","Trabalhos agaixados em painéis","Levantamento e transporte manual de cargas (23kg)"]},
                      {key:"terceiros", titulo:"Riscos a Terceiros", itens:["Energização acidental","Colisão de veículos"]},
                    ].map(section => (
                      <div key={section.key} className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="bg-slate-50 px-3 py-2 font-medium text-sm text-slate-700">{section.titulo}</div>
                        <div className="p-2 grid grid-cols-2 gap-1">
                          {section.itens.map(item => (
                            <label key={item} className={clsx("flex items-center gap-2 p-1.5 rounded cursor-pointer text-xs transition-all", aprSelections[`risco_${item}`] ? "bg-red-50 text-red-700" : "hover:bg-slate-50 text-slate-600")}>
                              <input type="checkbox" checked={!!aprSelections[`risco_${item}`]} onChange={() => toggleAPR(`risco_${item}`)} className="accent-red-500" />
                              {item}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* AREA DE IMPRESSAO - oculta na tela */}
              <div id="apr-print-area" style={{display:"none"}}>
                <style>{`@media print { body * { visibility: hidden !important; } #apr-print-area, #apr-print-area * { visibility: visible !important; } #apr-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 10mm; display: block !important; } @page { margin: 10mm; size: A4; } }`}</style>

                <table style={{width:"100%",borderCollapse:"collapse",marginBottom:"4px"}}>
                  <tbody>
                    <tr>
                      <td style={{border:"1px solid black",padding:"4px",textAlign:"center",fontWeight:"bold",fontSize:"11px"}} colSpan={3}>
                        SENERG - Setor de Energia<br/>
                        <span style={{fontSize:"10px",fontWeight:"normal"}}>Check-List de Segurança do Trabalho - Manutenção dos Sistemas de Abastecimento de Energia Elétrica</span>
                      </td>
                    </tr>
                    <tr>
                      <td style={{border:"1px solid black",padding:"4px",width:"40%",fontSize:"10px"}}><strong>Número (OS/PI):</strong> {order.number}</td>
                      <td style={{border:"1px solid black",padding:"4px",width:"35%",fontSize:"10px"}}><strong>Data:</strong> {form.actual_start ? new Date(form.actual_start).toLocaleDateString("pt-BR") : new Date().toLocaleDateString("pt-BR")}</td>
                      <td style={{border:"1px solid black",padding:"4px",width:"25%",fontSize:"10px"}}><strong>Turno:</strong> {form.actual_start ? (new Date(form.actual_start).getHours() < 12 ? "Manhã" : new Date(form.actual_start).getHours() < 18 ? "Tarde" : "Noite") : ""}</td>
                    </tr>
                    <tr>
                      <td style={{border:"1px solid black",padding:"4px",fontSize:"10px"}} colSpan={2}><strong>Supervisor do CCO:</strong></td>
                      <td style={{border:"1px solid black",padding:"4px",fontSize:"10px"}}><strong>Contato:</strong></td>
                    </tr>
                    <tr>
                      <td style={{border:"1px solid black",padding:"4px",fontSize:"10px"}} colSpan={2}><strong>Empresa Contratada:</strong> {form.contractor_name || ""} {form.contractor_preposto ? `— Preposto: ${form.contractor_preposto}` : ""}</td>
                      <td style={{border:"1px solid black",padding:"4px",fontSize:"10px"}}><strong>Há outras equipes?</strong> ☐ Sim &nbsp; ☐ Não</td>
                    </tr>
                  </tbody>
                </table>

                <table style={{width:"100%",borderCollapse:"collapse",marginBottom:"4px"}}>
                  <tbody>
                    <tr><td style={{border:"1px solid black",padding:"3px",background:"#d9d9d9",fontWeight:"bold",fontSize:"10px"}}>Descrição dos serviços a serem executados</td></tr>
                    <tr><td style={{border:"1px solid black",padding:"4px",minHeight:"40px",height:"40px",fontSize:"10px"}}>{order.title}{asset ? ` — ${asset.name} (${asset.tag})` : ""}</td></tr>
                  </tbody>
                </table>

                {Object.entries(aprSelections).some(([k,v]) => k.startsWith("epi_") && v) && (
                  <table style={{width:"100%",borderCollapse:"collapse",marginBottom:"4px"}}>
                    <tbody>
                      <tr><td colSpan={4} style={{border:"1px solid black",padding:"3px",background:"#d9d9d9",fontWeight:"bold",fontSize:"10px"}}>Equipamentos de segurança a serem utilizados</td></tr>
                      {(() => {
                        const selected = Object.entries(aprSelections).filter(([k,v]) => k.startsWith("epi_") && v).map(([k]) => k.replace("epi_",""));
                        const rows = [];
                        for (let i = 0; i < selected.length; i += 2) {
                          rows.push(
                            <tr key={i}>
                              <td style={{border:"1px solid black",padding:"3px",width:"5%",textAlign:"center",fontSize:"10px"}}>☑</td>
                              <td style={{border:"1px solid black",padding:"3px",width:"45%",fontSize:"10px"}}>{selected[i]}</td>
                              <td style={{border:"1px solid black",padding:"3px",width:"5%",textAlign:"center",fontSize:"10px"}}>{selected[i+1] ? "☑" : ""}</td>
                              <td style={{border:"1px solid black",padding:"3px",width:"45%",fontSize:"10px"}}>{selected[i+1] || ""}</td>
                            </tr>
                          );
                        }
                        return rows;
                      })()}
                    </tbody>
                  </table>
                )}

                {Object.entries(aprSelections).some(([k,v]) => k.startsWith("risco_") && v) && (
                  <table style={{width:"100%",borderCollapse:"collapse",marginBottom:"4px"}}>
                    <tbody>
                      <tr><td colSpan={2} style={{border:"1px solid black",padding:"3px",background:"#d9d9d9",fontWeight:"bold",fontSize:"10px"}}>Riscos Identificados</td></tr>
                      {Object.entries(aprSelections).filter(([k,v]) => k.startsWith("risco_") && v).map(([k]) => (
                        <tr key={k}>
                          <td style={{border:"1px solid black",padding:"3px",width:"5%",textAlign:"center",fontSize:"10px"}}>☑</td>
                          <td style={{border:"1px solid black",padding:"3px",fontSize:"10px"}}>{k.replace("risco_","")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                <table style={{width:"100%",borderCollapse:"collapse",marginBottom:"4px"}}>
                  <tbody>
                    <tr><td colSpan={2} style={{border:"1px solid black",padding:"3px",background:"#d9d9d9",fontWeight:"bold",fontSize:"10px"}}>Planejamento</td></tr>
                    {[
                      ["a)","A equipe conferiu o serviço a ser executado e está apta a realizar as tarefas?"],
                      ["b)","Todos estão cientes do procedimento de trabalho para a atividade?"],
                      ["c)","O CCO foi informado da presença da equipe na instalação?"],
                    ].map((row,i) => (
                      <tr key={i}>
                        <td style={{border:"1px solid black",padding:"3px",width:"85%",fontSize:"10px"}}><strong>{row[0]}</strong> {row[1]}</td>
                        <td style={{border:"1px solid black",padding:"3px",width:"15%",textAlign:"center",fontSize:"10px"}}>☐ Sim &nbsp; ☐ Não</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <table style={{width:"100%",borderCollapse:"collapse",marginBottom:"4px"}}>
                  <tbody>
                    <tr><td colSpan={2} style={{border:"1px solid black",padding:"3px",background:"#d9d9d9",fontWeight:"bold",fontSize:"10px"}}>Outros requisitos</td></tr>
                    {[
                      "Todo pessoal envolvido na atividade está sem adornos (relógio, crachá, anel/aliança, etc.) ?",
                      "A equipe conferiu o serviço a ser executado ? (Revisar)",
                      "A APR foi discutida e entendida por todos ?",
                      "Todos estão cientes que só deverão iniciar os serviços após autorização ?",
                    ].map((item,i) => (
                      <tr key={i}>
                        <td style={{border:"1px solid black",padding:"3px",width:"85%",fontSize:"10px"}}><strong>{i+1}</strong> {item}</td>
                        <td style={{border:"1px solid black",padding:"3px",width:"15%",textAlign:"center",fontSize:"10px"}}>☐ Sim &nbsp; ☐ Não</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <table style={{width:"100%",borderCollapse:"collapse",marginBottom:"4px"}}>
                  <tbody>
                    <tr><td colSpan={2} style={{border:"1px solid black",padding:"3px",background:"#d9d9d9",fontWeight:"bold",fontSize:"10px"}}>Término da manutenção (ANTES DA OPERAÇÃO DE REENERGIZAÇÃO)</td></tr>
                    {[
                      "Foram retirados os aterramentos temporários ?",
                      "Foram retirados os cartões de segurança e os bloqueios das seccionadoras/disjuntores ?",
                      "Foi retirado todo pessoal e ferramental da área a ser reenergizada ?",
                      "Foi preenchido o Livro de Registros de Acesso (SEs e CBs) ?",
                    ].map((item,i) => (
                      <tr key={i}>
                        <td style={{border:"1px solid black",padding:"3px",width:"85%",fontSize:"10px"}}><strong>{i+1}</strong> {item}</td>
                        <td style={{border:"1px solid black",padding:"3px",width:"15%",textAlign:"center",fontSize:"10px"}}>☐ Sim &nbsp; ☐ Não</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <table style={{width:"100%",borderCollapse:"collapse",marginBottom:"4px"}}>
                  <tbody>
                    <tr><td colSpan={3} style={{border:"1px solid black",padding:"3px",background:"#d9d9d9",fontWeight:"bold",fontSize:"10px"}}>Pessoal autorizado e ciente desta Permissão de Trabalho</td></tr>
                    <tr>
                      <th style={{border:"1px solid black",padding:"3px",width:"50%",textAlign:"left",fontSize:"10px"}}>Nome</th>
                      <th style={{border:"1px solid black",padding:"3px",width:"15%",fontSize:"10px"}}>RE</th>
                      <th style={{border:"1px solid black",padding:"3px",width:"35%",fontSize:"10px"}}>Visto</th>
                    </tr>
                    {[0,1,2,3].map(i => (
                      <tr key={i} style={{height:"20px"}}>
                        <td style={{border:"1px solid black",padding:"3px"}}>&nbsp;</td>
                        <td style={{border:"1px solid black",padding:"3px"}}>&nbsp;</td>
                        <td style={{border:"1px solid black",padding:"3px"}}>&nbsp;</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <table style={{width:"100%",borderCollapse:"collapse",marginBottom:"4px"}}>
                  <tbody>
                    <tr>
                      <td style={{border:"1px solid black",padding:"4px",width:"50%",fontSize:"10px"}}>
                        <strong>Visto do Responsável pela atividade:</strong>
                        <div style={{minHeight:"24px"}}>&nbsp;</div>
                      </td>
                      <td style={{border:"1px solid black",padding:"4px",width:"50%",fontSize:"10px"}}>
                        <strong>Justificativa:</strong>
                        <div style={{minHeight:"24px"}}>&nbsp;</div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <tbody>
                    <tr>
                      <td style={{border:"1px solid black",padding:"4px",fontSize:"9px"}}>
                        <strong>Direito de Recusa:</strong> "O trabalhador poderá interromper suas atividades quando constatar uma situação de trabalho onde, a seu ver, envolva um risco grave e iminente para a sua vida e saúde, informando imediatamente ao seu superior hierárquico." (Item 1.4.3 - Portaria nº 915 de 30 de julho de 2019 - SEPRT)
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div style={{textAlign:"right",fontSize:"8px",color:"#666",marginTop:"4px"}}>
                  SGM Ferroviario — APR/PT — OS: {order.number} — Emitido em: {new Date().toLocaleDateString("pt-BR")}
                </div>
              </div>
            </div>
          </div>
        )}

        {showCompanyModal && ('''

content = content[:start_idx] + new_apr + content[end_idx:]

if "aprSelections" in content and "toggleAPR" in content:
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK")
else:
    print("ERRO")
