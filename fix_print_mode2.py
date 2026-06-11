path = r"C:\Users\jacques.siman\sgm-ferroviario\frontend\src\app\work-orders\[id]\page.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Corrigir handlePrint e handlePrintAPR para usar DOM direto
old = '  const handlePrint = () => {\n    setPrintMode("os");\n    setTimeout(() => { window.print(); setPrintMode(null); }, 100);\n  };\n\n  const handlePrintAPR = () => {\n    setPrintMode("apr");\n    setTimeout(() => { window.print(); setPrintMode(null); }, 100);\n  };'
new = '  const handlePrint = () => {\n    const os = document.getElementById("print-area");\n    const apr = document.getElementById("apr-print-area");\n    if (os) os.setAttribute("data-printing", "true");\n    if (apr) apr.setAttribute("data-printing", "false");\n    setTimeout(() => {\n      window.print();\n      if (os) os.removeAttribute("data-printing");\n      if (apr) apr.removeAttribute("data-printing");\n    }, 100);\n  };\n\n  const handlePrintAPR = () => {\n    const os = document.getElementById("print-area");\n    const apr = document.getElementById("apr-print-area");\n    if (os) os.setAttribute("data-printing", "false");\n    if (apr) apr.setAttribute("data-printing", "true");\n    setTimeout(() => {\n      window.print();\n      if (os) os.removeAttribute("data-printing");\n      if (apr) apr.removeAttribute("data-printing");\n    }, 100);\n  };'
content = content.replace(old, new)

# Reverter display dos dois para sempre visiveis no DOM, CSS controla impressao
old = '      <div id="print-area" style={{ display: printMode === "os" ? "block" : "none" }}>'
new = '      <div id="print-area" style={{ display: "none" }}>'
content = content.replace(old, new)

old = '              <div id="apr-print-area" style={{display: printMode === "apr" ? "block" : "none"}}>'
new = '              <div id="apr-print-area" style={{display: "none"}}>'
content = content.replace(old, new)

# Corrigir CSS OS - usar data-printing
old = '        @media print {\n          body * { visibility: hidden !important; }\n          #print-area, #print-area * { visibility: visible !important; }\n          #print-area { position: absolute; left: 0; top: 0; width: 100%; }\n          #apr-print-area { display: none !important; visibility: hidden !important; }\n          @page { margin: 10mm; size: A4; }\n        }'
new = '        @media print {\n          body * { visibility: hidden !important; }\n          #print-area[data-printing="true"], #print-area[data-printing="true"] * { visibility: visible !important; }\n          #print-area[data-printing="true"] { position: absolute; left: 0; top: 0; width: 100%; display: block !important; }\n          #apr-print-area[data-printing="true"], #apr-print-area[data-printing="true"] * { visibility: visible !important; }\n          #apr-print-area[data-printing="true"] { position: absolute; left: 0; top: 0; width: 100%; padding: 10mm; display: block !important; }\n          @page { margin: 10mm; size: A4; }\n        }'
content = content.replace(old, new)

# Remover CSS duplicado da APR
old = '@media print { body * { visibility: hidden !important; } #print-area { display: none !important; visibility: hidden !important; } #apr-print-area, #apr-print-area * { visibility: visible !important; } #apr-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 10mm; display: block !important; } @page { margin: 10mm; size: A4; } }'
new = ''
content = content.replace(old, new)

checks = ["data-printing" in content, "handlePrintAPR" in content]
if all(checks):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK")
else:
    print("ERRO - checks:", checks)
