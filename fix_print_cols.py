path = r"C:\Users\jacques.siman\sgm-ferroviario\frontend\src\app\work-orders\[id]\page.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '            <td style={{width:"18%"}}><strong>OS ROMARCK Nº:</strong><br/>{order.number}</td>\n            <td style={{width:"30%"}}><strong>LOCAL:</strong><br/>Sala do GGD</td>\n            <td style={{width:"12%"}}><strong>SEMANA:</strong><br/>&nbsp;</td>\n            <td style={{width:"12%"}}><strong>TURNO:</strong><br/>{form.actual_start ? (new Date(form.actual_start).getHours() < 12 ? "MANHÃ" : new Date(form.actual_start).getHours() < 18 ? "TARDE" : "NOITE") : ""}</td>\n            <td style={{width:"28%"}}>\n              <strong>Fiscal Trensurb (1):</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>RE:</strong><br/>\n              <strong>Fiscal Trensurb (2):</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>RE:</strong>\n            </td>'

new = '            <td style={{width:"16%"}}><strong>OS ROMARCK Nº:</strong><br/>{order.number}</td>\n            <td style={{width:"18%"}}><strong>LOCAL:</strong><br/>Sala do GGD</td>\n            <td style={{width:"10%"}}><strong>SEMANA:</strong><br/>&nbsp;</td>\n            <td style={{width:"10%"}}><strong>TURNO:</strong><br/>{form.actual_start ? (new Date(form.actual_start).getHours() < 12 ? "MANHÃ" : new Date(form.actual_start).getHours() < 18 ? "TARDE" : "NOITE") : ""}</td>\n            <td style={{width:"46%"}}>\n              <strong>Fiscal Trensurb (1):</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>RE:</strong><br/>\n              <strong>Fiscal Trensurb (2):</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>RE:</strong>\n            </td>'

if old in content:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK")
else:
    print("ERRO")
