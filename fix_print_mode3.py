path = r"C:\Users\jacques.siman\sgm-ferroviario\frontend\src\app\work-orders\[id]\page.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Corrigir handlePrint e handlePrintAPR - copiar conteudo para area unica
old = '  const handlePrint = () => {\n    const os = document.getElementById("print-area");\n    const apr = document.getElementById("apr-print-area");\n    if (os) os.setAttribute("data-printing", "true");\n    if (apr) apr.setAttribute("data-printing", "false");\n    setTimeout(() => {\n      window.print();\n      if (os) os.removeAttribute("data-printing");\n      if (apr) apr.removeAttribute("data-printing");\n    }, 100);\n  };\n\n  const handlePrintAPR = () => {\n    const os = document.getElementById("print-area");\n    const apr = document.getElementById("apr-print-area");\n    if (os) os.setAttribute("data-printing", "false");\n    if (apr) apr.setAttribute("data-printing", "true");\n    setTimeout(() => {\n      window.print();\n      if (os) os.removeAttribute("data-printing");\n      if (apr) apr.removeAttribute("data-printing");\n    }, 100);\n  };'

new = '  const handlePrint = () => {\n    const os = document.getElementById("print-area");\n    const apr = document.getElementById("apr-print-area");\n    if (os) { os.style.display = "block"; }\n    if (apr) { apr.style.display = "none"; }\n    setTimeout(() => {\n      window.print();\n      if (os) { os.style.display = "none"; }\n    }, 100);\n  };\n\n  const handlePrintAPR = () => {\n    const os = document.getElementById("print-area");\n    const apr = document.getElementById("apr-print-area");\n    if (os) { os.style.display = "none"; }\n    if (apr) { apr.style.display = "block"; }\n    setTimeout(() => {\n      window.print();\n      if (apr) { apr.style.display = "none"; }\n    }, 100);\n  };'

if old in content:
    content = content.replace(old, new)
    print("handlePrint OK")
else:
    print("ERRO handlePrint nao encontrado")

# Restaurar CSS simples
old2 = '        @media print {\n          body * { visibility: hidden !important; }\n          #print-area[data-printing="true"], #print-area[data-printing="true"] * { visibility: visible !important; }\n          #print-area[data-printing="true"] { position: absolute; left: 0; top: 0; width: 100%; display: block !important; }\n          #apr-print-area[data-printing="true"], #apr-print-area[data-printing="true"] * { visibility: visible !important; }\n          #apr-print-area[data-printing="true"] { position: absolute; left: 0; top: 0; width: 100%; padding: 10mm; display: block !important; }\n          @page { margin: 10mm; size: A4; }\n        }'
new2 = '        @media print {\n          body * { visibility: hidden !important; }\n          #print-area, #print-area * { visibility: visible !important; }\n          #print-area { position: absolute; left: 0; top: 0; width: 100%; }\n          #apr-print-area, #apr-print-area * { visibility: visible !important; }\n          #apr-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 10mm; }\n          @page { margin: 10mm; size: A4; }\n        }'

if old2 in content:
    content = content.replace(old2, new2)
    print("CSS OK")
else:
    print("ERRO CSS nao encontrado")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
