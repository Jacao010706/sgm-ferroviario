import io
p = "coletor_modbus.py"
c = io.open(p, encoding="utf-8").read()
old = '        "external_tank":   dados.get("external_tank"),\n    }'
new = '        "external_tank":   dados.get("external_tank"),\n        "dse_flex":        dados.get("dse_flex"),\n    }'
if old not in c:
    print("ALVO NAO ENCONTRADO")
else:
    io.open(p,"w",encoding="utf-8").write(c.replace(old,new,1))
    print("OK: dse_flex adicionado ao payload")
