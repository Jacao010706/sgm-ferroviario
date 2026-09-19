# -*- coding: utf-8 -*-
import shutil, io

p = "coletor_modbus.py"
shutil.copyfile(p, p + ".bak")

content = io.open(p, encoding="utf-8").read()

ALVO = '            "freq_rede":      r(reg_map["freq_rede"]) * ff,\n        }'

if ALVO not in content:
    print("ALVO NAO ENCONTRADO - verifique o coletor. Nada mudou.")
    raise SystemExit(1)

INSERCAO = '''            "freq_rede":      r(reg_map["freq_rede"]) * ff,
        }
        # Alarmes do painel DSE - HR[2176..2179] (GenComm, 4 nibbles por registrador)
        if not is_stemac:
            try:
                ra = client.read_holding_registers(address=2176, count=4)
                if not ra.isError() and len(ra.registers) >= 4:
                    def _nibs(v):
                        return [(v >> (12 - pos * 4)) & 0xF for pos in range(4)]
                    di = _nibs(ra.registers[1]) + _nibs(ra.registers[2])
                    flex = _nibs(ra.registers[3])
                    dados["dse_di"] = di
                    dados["dse_flex"] = flex
                    if any(2 <= v <= 4 for v in di + flex):
                        log.warning(f"{tag}: ALARME ATIVO DI={di} FLEX={flex}")
                    if tag == "GMG-RODOVIARIA":
                        d = flex[3]
                        dados["external_tank"] = 1 if d == 1 else (0 if 2 <= d <= 4 else None)
                        log.info(f"{tag}: tanque_externo FLEX_D={d} -> {dados['external_tank']}")
                else:
                    log.warning(f"{tag}: nao leu bloco de alarmes HR[2176]")
            except Exception as e:
                log.warning(f"{tag}: falha ao ler alarmes - {e}")'''

content = content.replace(ALVO, INSERCAO, 1)
io.open(p, "w", encoding="utf-8").write(content)
print("OK: patch aplicado, backup em coletor_modbus.py.bak")
