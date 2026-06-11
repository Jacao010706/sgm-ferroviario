path = r"C:\Users\jacques.siman\sgm-ferroviario\frontend\src\app\work-orders\[id]\page.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Substituir span empty por linha em branco para preenchimento
old = '.print-field span.empty { color: #cbd5e1; font-weight: 400; font-style: italic; }'
new = '.print-field span.empty { color: transparent; border-bottom: 1px solid #94a3b8; display: inline-block; min-width: 120px; }'
content = content.replace(old, new)

# Substituir todos os textos "Nao informado" por espaco em branco
content = content.replace('>Nao informado</span>', '>&nbsp;</span>')

# Substituir os — (travessao) vazios por linha em branco
content = content.replace('<span className="empty">—</span>', '<span className="empty">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>')

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("OK")
