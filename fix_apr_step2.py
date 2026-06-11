path = r"C:\Users\jacques.siman\sgm-ferroviario\frontend\src\app\work-orders\[id]\page.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '        {showCompanyModal && ('
new = '''        {showAPR && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-800">APR / Check-List de Seguranca</h2>
                <div className="flex gap-2">
                  <button onClick={() => { const el = document.getElementById("apr-print-area"); if(el){el.style.display="block"; setTimeout(()=>{window.print(); el.style.display="none";},100);}}} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium">
                    <Printer size={14} /> Imprimir APR
                  </button>
                  <button onClick={() => setShowAPR(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-slate-700 text-sm mb-2">Equipamentos de Seguranca / EPIs</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {["Capacete de seguranca","Protetor facial verde","Oculos de protecao","Protetor auditivo","Respirador","Perneira","Tapete isolante","Vara de manobra","Detector de tensao","Aterramento temporario","Fitas/cones","Radio comunicador"].map(epi => (
                      <label key={epi} className={clsx("flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm transition-all", aprSelections[`epi_${epi}`] ? "border-orange-400 bg-orange-50 text-orange-800 font-medium" : "border-slate-200 hover:border-slate-300 text-slate-600")}>
                        <input type="checkbox" checked={!!aprSelections[`epi_${epi}`]} onChange={() => toggleAPR(`epi_${epi}`)} className="accent-orange-500" />
                        {epi}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-700 text-sm mb-2">Riscos Identificados</h3>
                  <div className="space-y-3">
                    {[
                      {key:"eletrico", titulo:"Riscos Eletricos", itens:["Contato com partes energizadas","Arco eletrico / flash eletrico","Inducao eletromagnetica","Eletricidade estatica"]},
                      {key:"queda", titulo:"Riscos de Queda", itens:["Queda de mesmo nivel","Queda de nivel diferente","Queda de objetos/ferramentas"]},
                      {key:"incendio", titulo:"Riscos de Incendio/Explosao", itens:["Presenca de gases inflamaveis","Curto circuito / faiscas","Materiais combustiveis no local"]},
                      {key:"mecanico", titulo:"Riscos Mecanicos", itens:["Contato com partes moveis de maquinas","Ferramentas inadequadas ou defeituosas","Projecao de particulas/fragmentos"]},
                      {key:"ergonomico", titulo:"Riscos Ergonomicos", itens:["Postura inadequada em estruturas","Trabalhos agaixados em paineis","Levantamento e transporte manual de cargas (23kg)"]},
                      {key:"terceiros", titulo:"Riscos a Terceiros", itens:["Energizacao acidental","Colisao de veiculos"]},
                    ].map((section: any) => (
                      <div key={section.key} className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="bg-slate-50 px-3 py-2 font-medium text-sm text-slate-700">{section.titulo}</div>
                        <div className="p-2 grid grid-cols-2 gap-1">
                          {section.itens.map((item: string) => (
                            <label key={item} className={clsx("flex items-center gap-2 p-1.5 rounded cursor-pointer text-xs transition-all", aprSelections[`risco_${item}`] ? "bg-red-50 text-red-700 font-medium" : "hover:bg-slate-50 text-slate-600")}>
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

              <div id="apr-print-area" style={{display:"none"}}>
                <style>{`@media print { body * { visibility: hidden !important; } #apr-print-area, #apr-print-area * { visibility: visible !important; } #apr-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 10mm; display: block !important; } @page { margin: 10mm; size: A4; } }`}</style>
                <table style={{width:"100%",borderCollapse:"collapse",marginBottom:"4px",fontFamily:"Arial,sans-serif",fontSize:"10px"}}>
                  <tbody>
                    <tr><td style={{border:"1px solid black",padding:"4px",textAlign:"center",fontWeight:"bold",fontSize:"11px"}} colSpan={3}>SENERG - Setor de Energia<br/><span style={{fontSize:"10px",fontWeight:"normal"}}>Check-List de Seguranca do Trabalho - Manutencao dos Sistemas de Abastecimento de Energia Eletrica</span></td></tr>
                    <tr>
                      <td style={{border:"1px solid black",padding:"4px",fontSize:"10px",width:"40%"}}><strong>Numero (OS/PI):</strong> {order.number}</td>
                      <td style={{border:"1px solid black",padding:"4px",fontSize:"10px",width:"35%"}}><strong>Data:</strong> {form.actual_start ? new Date(form.actual_start).toLocaleDateString("pt-BR") : new Date().toLocaleDateString("pt-BR")}</td>
                      <td style={{border:"1px solid black",padding:"4px",fontSize:"10px",width:"25%"}}><strong>Turno:</strong> {form.actual_start ? (new Date(form.actual_start).getHours() < 12 ? "Manha" : new Date(form.actual_start).getHours() < 18 ? "Tarde" : "Noite") : ""}</td>
                    </tr>
                    <tr>
                      <td style={{border:"1px solid black",padding:"4px",fontSize:"10px"}} colSpan={2}><strong>Supervisor do CCO:</strong></td>
                      <td style={{border:"1px solid black",padding:"4px",fontSize:"10px"}}><strong>Ha outras equipes?</strong> ☐ Sim &nbsp; ☐ Nao</td>
                    </tr>
                    <tr>
                      <td style={{border:"1px solid black",padding:"4px",fontSize:"10px"}} colSpan={3}><strong>Empresa Contratada:</strong> {form.contractor_name || ""} {form.contractor_preposto ? `— Preposto: ${form.contractor_preposto}` : ""}</td>
                    </tr>
                  </tbody>
                </table>

                <table style={{width:"100%",borderCollapse:"collapse",marginBottom:"4px",fontFamily:"Arial,sans-serif",fontSize:"10px"}}>
                  <tbody>
                    <tr><td style={{border:"1px solid black",padding:"3px",background:"#d9d9d9",fontWeight:"bold"}}>Descricao dos servicos a serem executados</td></tr>
                    <tr><td style={{border:"1px solid black",padding:"4px",height:"40px"}}>{order.title}{asset ? ` — ${asset.name} (${asset.tag})` : ""}</td></tr>
                  </tbody>
                </table>

                {Object.entries(aprSelections).some(([k,v]) => k.startsWith("epi_") && v) && (
                  <table style={{width:"100%",borderCollapse:"collapse",marginBottom:"4px",fontFamily:"Arial,sans-serif",fontSize:"10px"}}>
                    <tbody>
                      <tr><td colSpan={4} style={{border:"1px solid black",padding:"3px",background:"#d9d9d9",fontWeight:"bold"}}>Equipamentos de seguranca a serem utilizados</td></tr>
                      {(() => {
                        const sel = Object.entries(aprSelections).filter(([k,v]) => k.startsWith("epi_") && v).map(([k]) => k.replace("epi_",""));
                        const rows: any[] = [];
                        for(let i=0;i<sel.length;i+=2){
                          rows.push(<tr key={i}><td style={{border:"1px solid black",padding:"3px",width:"5%",textAlign:"center"}}>☑</td><td style={{border:"1px solid black",padding:"3px",width:"45%"}}>{sel[i]}</td><td style={{border:"1px solid black",padding:"3px",width:"5%",textAlign:"center"}}>{sel[i+1]?"☑":""}</td><td style={{border:"1px solid black",padding:"3px",width:"45%"}}>{sel[i+1]||""}</td></tr>);
                        }
                        return rows;
                      })()}
                    </tbody>
                  </table>
                )}

                {Object.entries(aprSelections).some(([k,v]) => k.startsWith("risco_") && v) && (
                  <table style={{width:"100%",borderCollapse:"collapse",marginBottom:"4px",fontFamily:"Arial,sans-serif",fontSize:"10px"}}>
                    <tbody>
                      <tr><td colSpan={2} style={{border:"1px solid black",padding:"3px",background:"#d9d9d9",fontWeight:"bold"}}>Riscos Identificados</td></tr>
                      {Object.entries(aprSelections).filter(([k,v]) => k.startsWith("risco_") && v).map(([k]) => (
                        <tr key={k}><td style={{border:"1px solid black",padding:"3px",width:"5%",textAlign:"center"}}>☑</td><td style={{border:"1px solid black",padding:"3px"}}>{k.replace("risco_","")}</td></tr>
                      ))}
                    </tbody>
                  </table>
                )}

                <table style={{width:"100%",borderCollapse:"collapse",marginBottom:"4px",fontFamily:"Arial,sans-serif",fontSize:"10px"}}>
                  <tbody>
                    <tr><td colSpan={2} style={{border:"1px solid black",padding:"3px",background:"#d9d9d9",fontWeight:"bold"}}>Planejamento</td></tr>
                    {[["a)","A equipe conferiu o servico a ser executado e esta apta a realizar as tarefas?"],["b)","Todos estao cientes do procedimento de trabalho para a atividade?"],["c)","O CCO foi informado da presenca da equipe na instalacao?"]].map((row,i) => (
                      <tr key={i}><td style={{border:"1px solid black",padding:"3px",width:"85%"}}><strong>{row[0]}</strong> {row[1]}</td><td style={{border:"1px solid black",padding:"3px",width:"15%",textAlign:"center"}}>☐ Sim &nbsp; ☐ Nao</td></tr>
                    ))}
                  </tbody>
                </table>

                <table style={{width:"100%",borderCollapse:"collapse",marginBottom:"4px",fontFamily:"Arial,sans-serif",fontSize:"10px"}}>
                  <tbody>
                    <tr><td colSpan={2} style={{border:"1px solid black",padding:"3px",background:"#d9d9d9",fontWeight:"bold"}}>Outros requisitos</td></tr>
                    {["Todo pessoal envolvido na atividade esta sem adornos (relogio, cracha, anel/alianca, etc.) ?","A equipe conferiu o servico a ser executado ? (Revisar)","A APR foi discutida e entendida por todos ?","Todos estao cientes que so deverao iniciar os servicos apos autorizacao ?"].map((item,i) => (
                      <tr key={i}><td style={{border:"1px solid black",padding:"3px",width:"85%"}}><strong>{i+1}</strong> {item}</td><td style={{border:"1px solid black",padding:"3px",width:"15%",textAlign:"center"}}>☐ Sim &nbsp; ☐ Nao</td></tr>
                    ))}
                  </tbody>
                </table>

                <table style={{width:"100%",borderCollapse:"collapse",marginBottom:"4px",fontFamily:"Arial,sans-serif",fontSize:"10px"}}>
                  <tbody>
                    <tr><td colSpan={2} style={{border:"1px solid black",padding:"3px",background:"#d9d9d9",fontWeight:"bold"}}>Termino da manutencao (ANTES DA OPERACAO DE REENERGIZACAO)</td></tr>
                    {["Foram retirados os aterramentos temporarios ?","Foram retirados os cartoes de seguranca e os bloqueios das seccionadoras/disjuntores ?","Foi retirado todo pessoal e ferramental da area a ser reenergizada ?","Foi preenchido o Livro de Registros de Acesso (SEs e CBs) ?"].map((item,i) => (
                      <tr key={i}><td style={{border:"1px solid black",padding:"3px",width:"85%"}}><strong>{i+1}</strong> {item}</td><td style={{border:"1px solid black",padding:"3px",width:"15%",textAlign:"center"}}>☐ Sim &nbsp; ☐ Nao</td></tr>
                    ))}
                  </tbody>
                </table>

                <table style={{width:"100%",borderCollapse:"collapse",marginBottom:"4px",fontFamily:"Arial,sans-serif",fontSize:"10px"}}>
                  <tbody>
                    <tr><td colSpan={3} style={{border:"1px solid black",padding:"3px",background:"#d9d9d9",fontWeight:"bold"}}>Pessoal autorizado e ciente desta Permissao de Trabalho</td></tr>
                    <tr><th style={{border:"1px solid black",padding:"3px",width:"50%",textAlign:"left"}}>Nome</th><th style={{border:"1px solid black",padding:"3px",width:"15%"}}>RE</th><th style={{border:"1px solid black",padding:"3px",width:"35%"}}>Visto</th></tr>
                    {[0,1,2,3].map(i => (<tr key={i} style={{height:"20px"}}><td style={{border:"1px solid black",padding:"3px"}}>&nbsp;</td><td style={{border:"1px solid black",padding:"3px"}}>&nbsp;</td><td style={{border:"1px solid black",padding:"3px"}}>&nbsp;</td></tr>))}
                  </tbody>
                </table>

                <table style={{width:"100%",borderCollapse:"collapse",marginBottom:"4px",fontFamily:"Arial,sans-serif",fontSize:"10px"}}>
                  <tbody>
                    <tr>
                      <td style={{border:"1px solid black",padding:"4px",width:"50%"}}><strong>Visto do Responsavel pela atividade:</strong><div style={{minHeight:"24px"}}>&nbsp;</div></td>
                      <td style={{border:"1px solid black",padding:"4px",width:"50%"}}><strong>Justificativa:</strong><div style={{minHeight:"24px"}}>&nbsp;</div></td>
                    </tr>
                  </tbody>
                </table>

                <table style={{width:"100%",borderCollapse:"collapse",fontFamily:"Arial,sans-serif"}}>
                  <tbody>
                    <tr><td style={{border:"1px solid black",padding:"4px",fontSize:"9px"}}><strong>Direito de Recusa:</strong> "O trabalhador podera interromper suas atividades quando constatar uma situacao de trabalho onde, a seu ver, envolva um risco grave e iminente para a sua vida e saude, informando imediatamente ao seu superior hierarquico." (Item 1.4.3 - Portaria no 915 de 30 de julho de 2019 - SEPRT)</td></tr>
                  </tbody>
                </table>
                <div style={{textAlign:"right",fontSize:"8px",color:"#666",marginTop:"4px",fontFamily:"Arial,sans-serif"}}>SGM Ferroviario — APR/PT — OS: {order.number} — Emitido em: {new Date().toLocaleDateString("pt-BR")}</div>
              </div>
            </div>
          </div>
        )}

        {showCompanyModal && ('''

if old in content:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK")
else:
    print("ERRO - marker nao encontrado")
