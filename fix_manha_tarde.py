path = r"C:\Users\jacques.siman\sgm-ferroviario\frontend\src\app\work-orders\[id]\page.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '            <td style={{width:"50%", verticalAlign:"top"}}>\n              <strong>MANHÃ:</strong>\n              <div style={{minHeight: 60, paddingTop: 4}}>{form.observations || ""}</div>\n            </td>\n            <td style={{width:"50%", verticalAlign:"top"}}>\n              <strong>TARDE:</strong>\n              <div style={{minHeight: 60}}>&nbsp;</div>\n            </td>'

new = '            <td style={{width:"50%", verticalAlign:"top"}}>\n              <strong>MANHÃ:</strong>\n              <div style={{minHeight: 160, paddingTop: 4}}>{form.observations || ""}</div>\n            </td>\n            <td style={{width:"50%", verticalAlign:"top"}}>\n              <strong>TARDE:</strong>\n              <div style={{minHeight: 160}}>&nbsp;</div>\n            </td>'

if old in content:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK")
else:
    print("ERRO")
