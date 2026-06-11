path = r"C:\Users\jacques.siman\sgm-ferroviario\frontend\src\app\fuel-orders\page.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '''        {o.observations && (
          <div style={{border:"1px solid black",padding:"4px",marginBottom:"4px"}}>
            <strong>Apontamento de observacoes:</strong>
            <p style={{marginTop:"2px"}}>{o.observations}</p>
          </div>
        )}
        <div style={{border:"1px solid black",padding:"4px",marginBottom:"4px",fontWeight:"bold"}}>
          CONDICOES DE SEGURANCA: REALIZAR A APR ANTES DO INICIO DAS ATIVIDADES
        </div>'''

new = '''        {o.observations && (
          <div style={{border:"1px solid black",padding:"4px",marginBottom:"4px"}}>
            <strong>Apontamento de observacoes:</strong>
            <p style={{marginTop:"2px"}}>{o.observations}</p>
          </div>
        )}
        {o.checklist_items && o.checklist_items.length > 0 && (
          <div style={{marginBottom:"4px"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:"10px"}}>
              <thead>
                <tr style={{backgroundColor:"#f0f0f0"}}>
                  <th colSpan={4} style={{border:"1px solid black",padding:"3px",textAlign:"center"}}>
                    CHECKLIST DE ATIVIDADES ({o.checklist_items.filter((i: any) => i.done).length}/{o.checklist_items.length} concluidos)
                  </th>
                </tr>
                <tr style={{backgroundColor:"#f0f0f0"}}>
                  <th style={{border:"1px solid black",padding:"3px",width:"4%"}}>✓</th>
                  <th style={{border:"1px solid black",padding:"3px",width:"46%",textAlign:"left"}}>Atividade</th>
                  <th style={{border:"1px solid black",padding:"3px",width:"4%"}}>✓</th>
                  <th style={{border:"1px solid black",padding:"3px",width:"46%",textAlign:"left"}}>Atividade</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({length: Math.ceil(o.checklist_items.length / 2)}, (_: any, i: number) => (
                  <tr key={i}>
                    <td style={{border:"1px solid black",padding:"3px",textAlign:"center"}}>{o.checklist_items[i*2]?.done ? "✓" : "☐"}</td>
                    <td style={{border:"1px solid black",padding:"3px",textDecoration:o.checklist_items[i*2]?.done?"line-through":"none",color:o.checklist_items[i*2]?.done?"#666":"#000"}}>{o.checklist_items[i*2]?.text}</td>
                    <td style={{border:"1px solid black",padding:"3px",textAlign:"center"}}>{o.checklist_items[i*2+1] ? (o.checklist_items[i*2+1]?.done ? "✓" : "☐") : ""}</td>
                    <td style={{border:"1px solid black",padding:"3px",textDecoration:o.checklist_items[i*2+1]?.done?"line-through":"none",color:o.checklist_items[i*2+1]?.done?"#666":"#000"}}>{o.checklist_items[i*2+1]?.text || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{border:"1px solid black",padding:"4px",marginBottom:"4px",fontWeight:"bold"}}>
          CONDICOES DE SEGURANCA: REALIZAR A APR ANTES DO INICIO DAS ATIVIDADES
        </div>'''

if old in content:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK")
else:
    print("ERRO")
