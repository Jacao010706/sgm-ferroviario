path = r"C:\Users\jacques.siman\sgm-ferroviario\frontend\src\app\fuel-orders\page.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '  const handlePrint = (order: any) => {\n    setPrintOrder(order);\n  };'
new = '  const handlePrint = (order: any) => {\n    setPrintOrder(order);\n    setTimeout(() => {\n      window.print();\n      window.onafterprint = () => setPrintOrder(null);\n    }, 300);\n  };'

if old in content:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK")
else:
    print("ERRO")
