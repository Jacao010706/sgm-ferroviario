path = r"C:\Users\jacques.siman\sgm-ferroviario\frontend\src\app\work-orders\[id]\page.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old_printview_start = 'function PrintView({ order, asset, subAsset, form, checklist, materials }: any) {'
old_printview_end = 'export default function WorkOrderDetailPage() {'

start_idx = content.index(old_printview_start)
end_idx = content.index(old_printview_end)

new_printview = '''function PrintView({ order, asset, subAsset, form, checklist, materials }: any) {
  const now = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const checklistDone = checklist.filter((i: ChecklistItem) => i.done).length;
  const isFuelOS = order.title?.toLowerCase().includes("abastecimento") || order.title?.toLowerCase().includes("combustivel");
  const periodicidade = order.maintenance_type === "preventive" ? (
    order.title?.toLowerCase().includes("mensal") ? "Mensal" :
    order.title?.toLowerCase().includes("semestral") ? "Semestral" :
    order.title?.toLowerCase().includes("anual") ? "Anual" :
    order.title?.toLowerCase().includes("bienal") ? "Bienal" : "Preventiva"
  ) : MAINTENANCE_LABEL[order.maintenance_type] || order.maintenance_type;

  return (
    <div id="print-area" style={{ display: "none" }}>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; }
          @page { margin: 10mm; size: A4; }
        }
        #print-area {
          font-family: Arial, sans-serif;
          font-size: 10px;
          color: #000;
          background: white;
          padding: 0;
          line-height: 1.3;
        }
        .trensurb-table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
        .trensurb-table td, .trensurb-table th {
          border: 1px solid #000;
          padding: 3px 5px;
          font-size: 9px;
          vertical-align: top;
        }
        .trensurb-table th {
          background: #d9d9d9;
          font-weight: bold;
          text-align: center;
          font-size: 9px;
        }
        .header-empresa {
          text-align: center;
          font-weight: bold;
          font-size: 12px;
          border: 1px solid #000;
          padding: 4px;
          margin-bottom: 0;
        }
        .header-senerg {
          font-weight: bold;
          font-size: 10px;
          border: 1px solid #000;
          border-top: none;
          padding: 3px 5px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .section-title {
          background: #d9d9d9;
          font-weight: bold;
          font-size: 9px;
          border: 1px solid #000;
          padding: 2px 5px;
          text-transform: uppercase;
        }
        .field-line {
          border-bottom: 1px solid #000;
          min-height: 16px;
          display: inline-block;
          width: 100%;
        }
        .sign-box {
          border-top: 1px solid #000;
          text-align: center;
          padding-top: 3px;
          font-size: 9px;
        }
        .obs-box {
          border: 1px solid #000;
          min-height: 80px;
          padding: 4px;
          font-size: 9px;
        }
        .checklist-print-item {
          display: flex;
          align-items: flex-start;
          gap: 4px;
          padding: 2px 0;
          border-bottom: 1px solid #eee;
          font-size: 9px;
        }
        .check-box-print {
          width: 10px;
          height: 10px;
          border: 1px solid #000;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 8px;
          margin-top: 1px;
        }
        .no-print { display: block; }
        @media print { .no-print { display: none !important; } }
      `}</style>

      {/* Botoes - nao imprimem */}
      <div className="no-print" style={{marginBottom: 12, display: "flex", gap: 8}}>
        <button onClick={() => { const el = document.getElementById("print-area"); if(el){el.style.display="block"; setTimeout(()=>{window.print(); el.style.display="none";},100);}}} style={{padding: "6px 16px", background: "#1E3A5F", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13}}>Imprimir</button>
        <button onClick={() => { const el = document.getElementById("print-area"); if(el) el.style.display="none"; }} style={{padding: "6px 16px", background: "#fff", border: "1px solid #ccc", borderRadius: 6, cursor: "pointer", fontSize: 13}}>Fechar</button>
      </div>

      {/* CABECALHO */}
      <div className="header-empresa">EMPRESA DE TRENS URBANOS DE PORTO ALEGRE S.A</div>
      <div className="header-senerg">
        <span>SENERG — ENERGIA</span>
        <span style={{fontSize: 11}}>OS Nº: <strong>{order.number}</strong></span>
      </div>

      {/* INFO PRINCIPAL */}
      <table className="trensurb-table" style={{marginTop: 0}}>
        <tbody>
          <tr>
            <td style={{width:"18%"}}><strong>OS ROMARCK Nº:</strong><br/>{order.number}</td>
            <td style={{width:"30%"}}><strong>LOCAL:</strong><br/>Sala do GGD</td>
            <td style={{width:"12%"}}><strong>SEMANA:</strong><br/>&nbsp;</td>
            <td style={{width:"12%"}}><strong>TURNO:</strong><br/>{form.actual_start ? (new Date(form.actual_start).getHours() < 12 ? "MANHÃ" : new Date(form.actual_start).getHours() < 18 ? "TARDE" : "NOITE") : ""}</td>
            <td style={{width:"28%"}}>
              <strong>Fiscal Trensurb (1):</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>RE:</strong><br/>
              <strong>Fiscal Trensurb (2):</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>RE:</strong>
            </td>
          </tr>
          <tr>
            <td colSpan={2}><strong>DATA DA EXECUÇÃO:</strong> {form.actual_start ? new Date(form.actual_start).toLocaleDateString("pt-BR") : ""}</td>
            <td colSpan={3}><strong>EMPRESA CONTRATADA:</strong> {form.contractor_name || ""}</td>
          </tr>
        </tbody>
      </table>

      {/* TABELA DE SERVICOS */}
      <table className="trensurb-table">
        <thead>
          <tr>
            <th style={{width:"35%"}}>Descrição</th>
            <th style={{width:"14%"}}>Periodicidade</th>
            <th style={{width:"21%"}}>Equipamento</th>
            <th style={{width:"10%"}}>Horário inicial</th>
            <th style={{width:"10%"}}>Horário final</th>
            <th style={{width:"5%"}}>Serviço concluído?</th>
            <th style={{width:"5%"}}>GGD em modo automático?</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{order.title}</td>
            <td style={{textAlign:"center"}}>{periodicidade}</td>
            <td>{asset ? `${asset.name} (${asset.tag})` : ""}{subAsset ? ` › ${subAsset.name}` : ""}</td>
            <td style={{textAlign:"center"}}>{form.actual_start ? new Date(form.actual_start).toLocaleTimeString("pt-BR", {hour:"2-digit",minute:"2-digit"}) : ""}</td>
            <td style={{textAlign:"center"}}>{form.actual_end ? new Date(form.actual_end).toLocaleTimeString("pt-BR", {hour:"2-digit",minute:"2-digit"}) : ""}</td>
            <td style={{textAlign:"center"}}>{form.status === "completed" ? "Sim" : ""}</td>
            <td style={{textAlign:"center"}}>&nbsp;</td>
          </tr>
        </tbody>
      </table>

      {/* ATIVIDADES / OBSERVACOES */}
      <table className="trensurb-table">
        <tbody>
          <tr>
            <td colSpan={2} className="section-title">Descrição das atividades, relação de materiais, apontamento de observações e inconformidades:</td>
          </tr>
          <tr>
            <td style={{width:"50%", verticalAlign:"top"}}>
              <strong>MANHÃ:</strong>
              <div style={{minHeight: 60, paddingTop: 4}}>{form.observations || ""}</div>
            </td>
            <td style={{width:"50%", verticalAlign:"top"}}>
              <strong>TARDE:</strong>
              <div style={{minHeight: 60}}>&nbsp;</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* CHECKLIST */}
      {checklist.length > 0 && (
        <table className="trensurb-table">
          <thead>
            <tr>
              <th colSpan={4}>CHECKLIST DE ATIVIDADES ({checklistDone}/{checklist.length} concluídos)</th>
            </tr>
            <tr>
              <th style={{width:"4%"}}>✓</th>
              <th style={{width:"46%"}}>Atividade</th>
              <th style={{width:"4%"}}>✓</th>
              <th style={{width:"46%"}}>Atividade</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({length: Math.ceil(checklist.length / 2)}, (_, i) => (
              <tr key={i}>
                <td style={{textAlign:"center"}}>{checklist[i*2]?.done ? "✓" : "☐"}</td>
                <td style={{textDecoration: checklist[i*2]?.done ? "line-through" : "none", color: checklist[i*2]?.done ? "#666" : "#000"}}>{checklist[i*2]?.text}</td>
                <td style={{textAlign:"center"}}>{checklist[i*2+1] ? (checklist[i*2+1]?.done ? "✓" : "☐") : ""}</td>
                <td style={{textDecoration: checklist[i*2+1]?.done ? "line-through" : "none", color: checklist[i*2+1]?.done ? "#666" : "#000"}}>{checklist[i*2+1]?.text || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* MATERIAIS */}
      {materials.length > 0 && (
        <table className="trensurb-table">
          <thead>
            <tr><th colSpan={4}>MATERIAIS UTILIZADOS</th></tr>
            <tr>
              <th style={{width:"5%"}}>#</th>
              <th style={{width:"55%"}}>Material / Peça</th>
              <th style={{width:"20%"}}>Quantidade</th>
              <th style={{width:"20%"}}>Unidade</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((mat: Material, i: number) => (
              <tr key={mat.id}>
                <td style={{textAlign:"center"}}>{i+1}</td>
                <td>{mat.name}</td>
                <td style={{textAlign:"center"}}>{mat.quantity}</td>
                <td style={{textAlign:"center"}}>{mat.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* CONDICOES DE SEGURANCA */}
      <table className="trensurb-table">
        <tbody>
          <tr><td className="section-title" colSpan={4}>CONDIÇÕES DE SEGURANÇA: REALIZAR A APR ANTES DO INÍCIO DAS ATIVIDADES</td></tr>
          <tr>
            <td style={{width:"25%"}}><strong>EMPREGADOS</strong></td>
            <td style={{width:"10%"}}><strong>RE</strong></td>
            <td style={{width:"25%"}}><strong>EMPREGADOS</strong></td>
            <td style={{width:"10%"}}><strong>RE</strong></td>
          </tr>
          <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
          <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
          <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
        </tbody>
      </table>

      {/* ASSINATURAS */}
      <table className="trensurb-table">
        <tbody>
          <tr>
            <td style={{width:"33%"}}>
              <strong>Programada por:</strong><br/>
              <div style={{minHeight:16}}>&nbsp;</div>
              <div style={{display:"flex", gap:8}}>
                <span>RE:</span>
                <span>Assinatura:</span>
              </div>
            </td>
            <td style={{width:"34%"}}>
              <strong>Preposto da CONTRATADA {form.contractor_name || ""}:</strong><br/>
              <div style={{minHeight:16}}>{form.contractor_preposto || ""}</div>
            </td>
            <td style={{width:"33%"}}>
              <strong>Fiscal Trensurb (M):</strong><br/>
              <div style={{minHeight:16}}>&nbsp;</div>
              <strong>Fiscal Trensurb (T):</strong><br/>
              <div style={{minHeight:16}}>&nbsp;</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* OBSERVACOES GESTAO */}
      <table className="trensurb-table">
        <tbody>
          <tr><td className="section-title">OBSERVAÇÕES DA GESTÃO / SUPERVISÃO</td></tr>
          <tr><td style={{minHeight:80, height:80}}>{form.observations || ""}&nbsp;</td></tr>
        </tbody>
      </table>

      {/* RESPONSAVEL */}
      <table className="trensurb-table">
        <thead>
          <tr><th colSpan={4}>RESPONSÁVEL PELAS OBSERVAÇÕES</th></tr>
          <tr>
            <th style={{width:"40%"}}>Nome</th>
            <th style={{width:"15%"}}>RE</th>
            <th style={{width:"20%"}}>Data</th>
            <th style={{width:"25%"}}>Assinatura</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{height:24}}>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
          </tr>
        </tbody>
      </table>

      <div style={{textAlign:"right", fontSize:8, color:"#666", marginTop:4}}>
        SGM Ferroviario — Emitido em: {now} | OS: {order.number}
      </div>
    </div>
  );
}

'''

content = content[:start_idx] + new_printview + content[end_idx:]

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("OK")
