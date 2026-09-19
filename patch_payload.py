import io
p = "coletor_modbus.py"
c = io.open(p, encoding="utf-8").read()
old = '        "battery_voltage": dados.get("bateria"),\n    }'
new = '        "battery_voltage": dados.get("bateria"),\n        "external_tank":   dados.get("external_tank"),\n    }'
if old not in c:
    print("ALVO NAO ENCONTRADO")
else:
    io.open(p,"w",encoding="utf-8").write(c.replace(old,new,1))
    print("OK: external_tank adicionado ao payload")
