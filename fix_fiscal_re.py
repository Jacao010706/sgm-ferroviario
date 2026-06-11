path = r"C:\Users\jacques.siman\sgm-ferroviario\frontend\src\app\work-orders\[id]\page.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '            <td style={{width:"46%"}}>\n              <strong>Fiscal Trensurb (1):</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>RE:</strong><br/>\n              <strong>Fiscal Trensurb (2):</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>RE:</strong>\n            </td>'

new = '            <td style={{width:"46%"}}>\n              <table style={{width:"100%",borderCollapse:"collapse"}}><tbody>\n                <tr>\n                  <td style={{width:"75%",border:"none",padding:"1px 0"}}><strong>Fiscal Trensurb (1):</strong></td>\n                  <td style={{width:"25%",border:"none",padding:"1px 0"}}><strong>RE:</strong></td>\n                </tr>\n                <tr>\n                  <td style={{border:"none",padding:"1px 0"}}><strong>Fiscal Trensurb (2):</strong></td>\n                  <td style={{border:"none",padding:"1px 0"}}><strong>RE:</strong></td>\n                </tr>\n              </tbody></table>\n            </td>'

if old in content:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK")
else:
    print("ERRO")
