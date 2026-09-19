import io
p = "coletor_modbus.py"
lines = io.open(p, encoding="utf-8").readlines()
changed = False
for i, line in enumerate(lines):
    if 'dados["external_tank"] = 1 if d == 1 else (0 if 2 <= d <= 4 else None)' in line:
        lines[i] = line.replace(
            'dados["external_tank"] = 1 if d == 1 else (0 if 2 <= d <= 4 else None)',
            'dados["external_tank"] = 0 if d == 0 else 1  # sem alarme=BAIXO, alarme ativo=CHEIO'
        )
        changed = True
        print(f"OK: linha {i+1} alterada")
if not changed:
    print("ALVO NAO ENCONTRADO")
    for i, line in enumerate(lines):
        if "external_tank" in line:
            print(f"  linha {i+1}: {repr(line.rstrip())}")
else:
    io.open(p, "w", encoding="utf-8").writelines(lines)
