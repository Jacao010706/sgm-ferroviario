path = r"C:\Users\jacques.siman\sgm-ferroviario\frontend\src\app\work-orders\[id]\page.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Adicionar estado printMode
old = '  const [showAPR, setShowAPR] = useState(false);'
new = '  const [showAPR, setShowAPR] = useState(false);\n  const [printMode, setPrintMode] = useState<"os"|"apr"|null>(null);'
content = content.replace(old, new)

# 2. Corrigir handlePrint da OS
old = '  const handlePrint = () => {\n    const printArea = document.getElementById("print-area");\n    if (printArea) {\n      printArea.style.display = "block";\n      setTimeout(() => { window.print(); printArea.style.display = "none"; }, 100);\n    }\n  };'
new = '  const handlePrint = () => {\n    setPrintMode("os");\n    setTimeout(() => { window.print(); setPrintMode(null); }, 100);\n  };\n\n  const handlePrintAPR = () => {\n    setPrintMode("apr");\n    setTimeout(() => { window.print(); setPrintMode(null); }, 100);\n  };'
content = content.replace(old, new)

# 3. Corrigir botao imprimir APR no modal
old = '                  <button onClick={() => { const el = document.getElementById("apr-print-area"); if(el){el.style.display="block"; setTimeout(()=>{window.print(); el.style.display="none";},100);}}} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium">'
new = '                  <button onClick={handlePrintAPR} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium">'
content = content.replace(old, new)

# 4. Corrigir CSS da OS - so mostra print-area quando printMode=os
old = '    <style>{`\n        @media print {\n          body * { visibility: hidden !important; }\n          #print-area, #print-area * { visibility: visible !important; }\n          #print-area { position: absolute; left: 0; top: 0; width: 100%; }\n          @page { margin: 10mm; size: A4; }\n        }'
new = '    <style>{`\n        @media print {\n          body * { visibility: hidden !important; }\n          #print-area, #print-area * { visibility: visible !important; }\n          #print-area { position: absolute; left: 0; top: 0; width: 100%; }\n          #apr-print-area { display: none !important; visibility: hidden !important; }\n          @page { margin: 10mm; size: A4; }\n        }'
content = content.replace(old, new)

# 5. Corrigir CSS da APR - so mostra apr-print-area quando printMode=apr
old = '@media print { body * { visibility: hidden !important; } #print-area { display: none !important; } #apr-print-area, #apr-print-area * { visibility: visible !important; } #apr-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 10mm; display: block !important; } @page { margin: 10mm; size: A4; } }'
new = '@media print { body * { visibility: hidden !important; } #print-area { display: none !important; visibility: hidden !important; } #apr-print-area, #apr-print-area * { visibility: visible !important; } #apr-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 10mm; display: block !important; } @page { margin: 10mm; size: A4; } }'
content = content.replace(old, new)

# 6. Fazer apr-print-area visivel/oculto baseado no printMode - substituir display:none fixo
old = '              <div id="apr-print-area" style={{display:"none"}}>'
new = '              <div id="apr-print-area" style={{display: printMode === "apr" ? "block" : "none"}}>'
content = content.replace(old, new)

# 7. Fazer print-area visivel/oculto baseado no printMode
old = '      <div id="print-area" style={{ display: "none" }}>'
new = '      <div id="print-area" style={{ display: printMode === "os" ? "block" : "none" }}>'
content = content.replace(old, new)

checks = ["printMode" in content, "handlePrintAPR" in content]
if all(checks):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK")
else:
    print("ERRO - checks:", checks)
