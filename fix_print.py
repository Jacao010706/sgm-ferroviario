path = r"C:\Users\jacques.siman\sgm-ferroviario\frontend\src\app\fuel-orders\page.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

print_component = '''
  if (printOrder) {
    const o = printOrder;
    const totalFornecido = o.items?.reduce((acc: number, i: any) => acc + (i.supplied_liters || 0), 0) || 0;
    return (
      <div className="p-6" style={{fontFamily: "Arial, sans-serif", fontSize: "10px"}}>
        <style>{`@media print { .no-print { display: none !important; } }`}</style>
        <div className="no-print mb-4 flex gap-2">
          <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded text-sm">Imprimir</button>
          <button onClick={() => setPrintOrder(null)} className="px-4 py-2 border rounded text-sm">Fechar</button>
        </div>
        <div style={{border:"1px solid black",padding:"4px",marginBottom:"4px"}}>
          <div style={{textAlign:"center",fontWeight:"bold",fontSize:"12px"}}>EMPRESA DE TRENS URBANOS DE PORTO ALEGRE S.A</div>
          <div style={{textAlign:"center",fontWeight:"bold"}}>SENERG ENERGIA</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"4px",marginTop:"4px"}}>
            <div><strong>Ordem de Servico Interno N°:</strong> {o.number}</div>
            <div><strong>DATA DA EXECUCAO:</strong> {new Date(o.execution_date).toLocaleDateString("pt-BR")}</div>
            <div><strong>LOCAL:</strong> {o.location}</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"4px",marginTop:"4px"}}>
            <div><strong>SEMANA:</strong> {o.week || "-"}</div>
            <div><strong>SETOR:</strong> {o.sector}</div>
            <div><strong>TURNO:</strong> {o.shift}</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px",marginTop:"4px"}}>
            <div><strong>Fiscal Trensurb (1):</strong> {o.fiscal_1 || "___________________"} <strong>RE:</strong> {o.fiscal_1_re || "______"}</div>
            <div><strong>Fiscal Trensurb (2):</strong> {o.fiscal_2 || "___________________"} <strong>RE:</strong> {o.fiscal_2_re || "______"}</div>
          </div>
          <div style={{marginTop:"4px",fontWeight:"bold"}}>{o.supplier} - FORNECIMENTO DE DIESEL</div>
        </div>
        <div style={{marginBottom:"4px"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:"10px"}}>
            <thead>
              <tr style={{backgroundColor:"#f0f0f0"}}>
                <th style={{border:"1px solid black",padding:"3px",textAlign:"left"}}>Descricao</th>
                <th style={{border:"1px solid black",padding:"3px"}}>Unidade</th>
                <th style={{border:"1px solid black",padding:"3px"}}>Subitem</th>
                <th style={{border:"1px solid black",padding:"3px",textAlign:"left"}}>Equipamentos</th>
                <th style={{border:"1px solid black",padding:"3px"}}>Previsao (L)</th>
                <th style={{border:"1px solid black",padding:"3px"}}>Fornecimento (L)</th>
                <th style={{border:"1px solid black",padding:"3px"}}>GGD automatico?</th>
              </tr>
            </thead>
            <tbody>
              {o.items?.map((item: any, idx: number) => (
                <tr key={idx}>
                  <td style={{border:"1px solid black",padding:"3px"}}>{idx === 0 ? "Fornecimento de oleo diesel S-500 aos grupos geradores a diesel." : ""}</td>
                  <td style={{border:"1px solid black",padding:"3px",textAlign:"center"}}>Litro</td>
                  <td style={{border:"1px solid black",padding:"3px",textAlign:"center"}}>{item.subitem}</td>
                  <td style={{border:"1px solid black",padding:"3px"}}>{item.station}</td>
                  <td style={{border:"1px solid black",padding:"3px",textAlign:"center"}}>{item.forecast_liters || "-"}</td>
                  <td style={{border:"1px solid black",padding:"3px",textAlign:"center"}}>{item.supplied_liters || ""}</td>
                  <td style={{border:"1px solid black",padding:"3px",textAlign:"center"}}>{item.ggd_automatic || ""}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={5} style={{border:"1px solid black",padding:"3px",textAlign:"right",fontWeight:"bold"}}>TOTAL DE LITROS FORNECIDOS:</td>
                <td style={{border:"1px solid black",padding:"3px",textAlign:"center",fontWeight:"bold"}}>{totalFornecido || ""}</td>
                <td style={{border:"1px solid black",padding:"3px"}}></td>
              </tr>
            </tbody>
          </table>
        </div>
        {(o.additive_station || o.additive_forecast_ml) && (
          <div style={{marginBottom:"4px"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:"10px"}}>
              <thead>
                <tr style={{backgroundColor:"#f0f0f0"}}>
                  <th style={{border:"1px solid black",padding:"3px",textAlign:"left"}}>Descricao</th>
                  <th style={{border:"1px solid black",padding:"3px"}}>Unidade</th>
                  <th style={{border:"1px solid black",padding:"3px",textAlign:"left"}}>Equipamentos</th>
                  <th style={{border:"1px solid black",padding:"3px"}}>Previsao (ml)</th>
                  <th style={{border:"1px solid black",padding:"3px"}}>Quantidade (ml)</th>
                  <th style={{border:"1px solid black",padding:"3px"}}>Servico Concluido?</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{border:"1px solid black",padding:"3px"}}>Colocacao de Aditivo.</td>
                  <td style={{border:"1px solid black",padding:"3px",textAlign:"center"}}>ml</td>
                  <td style={{border:"1px solid black",padding:"3px"}}>{o.additive_station}</td>
                  <td style={{border:"1px solid black",padding:"3px",textAlign:"center"}}>{o.additive_forecast_ml}</td>
                  <td style={{border:"1px solid black",padding:"3px",textAlign:"center"}}>{o.additive_quantity_ml}</td>
                  <td style={{border:"1px solid black",padding:"3px",textAlign:"center"}}>{o.additive_completed}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {o.observations && (
          <div style={{border:"1px solid black",padding:"4px",marginBottom:"4px"}}>
            <strong>Apontamento de observacoes:</strong>
            <p style={{marginTop:"2px"}}>{o.observations}</p>
          </div>
        )}
        <div style={{border:"1px solid black",padding:"4px",marginBottom:"4px",fontWeight:"bold"}}>
          CONDICOES DE SEGURANCA: REALIZAR A APR ANTES DO INICIO DAS ATIVIDADES
        </div>
        <div style={{border:"1px solid black",padding:"4px",marginBottom:"4px"}}>
          <div style={{fontWeight:"bold",marginBottom:"4px"}}>EMPREGADOS TRENSURB</div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr>
                <th style={{border:"1px solid black",padding:"3px",textAlign:"left"}}>Nome</th>
                <th style={{border:"1px solid black",padding:"3px"}}>RE</th>
                <th style={{border:"1px solid black",padding:"3px"}}>Assinatura</th>
                <th style={{border:"1px solid black",padding:"3px",textAlign:"left"}}>Nome</th>
                <th style={{border:"1px solid black",padding:"3px"}}>RE</th>
                <th style={{border:"1px solid black",padding:"3px"}}>Assinatura</th>
              </tr>
            </thead>
            <tbody>
              {[0,1,2].map(idx2 => (
                <tr key={idx2} style={{height:"20px"}}>
                  <td style={{border:"1px solid black",padding:"3px"}}>{idx2 === 0 ? (o.employee_1_name || "") : ""}</td>
                  <td style={{border:"1px solid black",padding:"3px"}}>{idx2 === 0 ? (o.employee_1_re || "") : ""}</td>
                  <td style={{border:"1px solid black",padding:"3px"}}></td>
                  <td style={{border:"1px solid black",padding:"3px"}}>{idx2 === 0 ? (o.employee_2_name || "") : ""}</td>
                  <td style={{border:"1px solid black",padding:"3px"}}>{idx2 === 0 ? (o.employee_2_re || "") : ""}</td>
                  <td style={{border:"1px solid black",padding:"3px"}}></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{border:"1px solid black",padding:"4px",marginBottom:"4px"}}>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:"8px"}}>
            <div><strong>Superior responsavel pela area:</strong> {o.responsible_name}</div>
            <div><strong>RE:</strong> {o.responsible_re}</div>
            <div><strong>Contato do CCO:</strong></div>
          </div>
          <div style={{marginTop:"8px"}}>
            <div><strong>Fiscal Trensurb (1):</strong> ___________________________________</div>
            <div style={{marginTop:"4px"}}><strong>Fiscal Trensurb (2):</strong> ___________________________________</div>
            <div style={{marginTop:"4px"}}><strong>Preposto da Contratada:</strong> ___________________________________</div>
          </div>
        </div>
        <div style={{border:"1px solid black",padding:"4px",marginBottom:"4px"}}>
          <strong>OBSERVACOES DA GESTAO / SUPERVISAO</strong>
          <div style={{height:"60px",marginTop:"4px"}}>{o.management_observations}</div>
        </div>
        <div style={{border:"1px solid black",padding:"4px"}}>
          <strong>RESPONSAVEL PELAS OBSERVACOES</strong>
          <table style={{width:"100%",borderCollapse:"collapse",marginTop:"4px"}}>
            <thead>
              <tr>
                <th style={{border:"1px solid black",padding:"3px",textAlign:"left"}}>Nome</th>
                <th style={{border:"1px solid black",padding:"3px"}}>RE</th>
                <th style={{border:"1px solid black",padding:"3px"}}>Data</th>
                <th style={{border:"1px solid black",padding:"3px"}}>Assinatura</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{height:"30px"}}>
                <td style={{border:"1px solid black",padding:"3px"}}></td>
                <td style={{border:"1px solid black",padding:"3px"}}></td>
                <td style={{border:"1px solid black",padding:"3px"}}></td>
                <td style={{border:"1px solid black",padding:"3px"}}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

'''

old = "  const handlePrint = (order: any) => {\n    setPrintOrder(order);\n    setTimeout(() => window.print(), 300);\n  };"
new = "  const handlePrint = (order: any) => {\n    setPrintOrder(order);\n  };"

content = content.replace(old, new)

# Inserir componente de impressao antes do return principal
old2 = "  const totalThisMonth = orders.filter"
new2 = print_component + "  const totalThisMonth = orders.filter"
content = content.replace(old2, new2)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("OK" if "EMPREGADOS TRENSURB" in content else "ERRO")
