content = open('coletor_modbus.py', encoding='utf-8').read()

old = (
    '        rpm = r(1030) if not is_stemac else 0\n'
    '\n'
    '        dados = {\n'
    '            "status":         r(reg_map["status"]),\n'
    '            "rpm":            rpm,\n'
    '            "tensao_l1":      r(reg_map["tensao_l1"]) * f1 if rpm > 0 else 0,\n'
    '            "tensao_l2":      r(reg_map["tensao_l2"]) * f1 if rpm > 0 else 0,\n'
    '            "tensao_l3":      r(reg_map["tensao_l3"]) * f1 if rpm > 0 else 0,\n'
)

new = (
    '        rpm = r(1030) if not is_stemac else 0\n'
    '        stemac_running = bool(regs_stemac[56] & 0x0001) if is_stemac else False\n'
    '        is_running = stemac_running if is_stemac else rpm > 0\n'
    '\n'
    '        dados = {\n'
    '            "status":         r(reg_map["status"]),\n'
    '            "rpm":            rpm,\n'
    '            "stemac_running": stemac_running,\n'
    '            "tensao_l1":      r(reg_map["tensao_l1"]) * f1 if is_running else 0,\n'
    '            "tensao_l2":      r(reg_map["tensao_l2"]) * f1 if is_running else 0,\n'
    '            "tensao_l3":      r(reg_map["tensao_l3"]) * f1 if is_running else 0,\n'
)

old2 = '        "is_running":      1 if dados.get("rpm", 0) > 0 else 0,'
new2 = '        "is_running":      1 if (dados.get("rpm", 0) > 0 or dados.get("stemac_running", False)) else 0,'

assert old in content, 'PATCH 1 NAO ENCONTRADO'
content = content.replace(old, new)
assert old2 in content, 'PATCH 2 NAO ENCONTRADO'
content = content.replace(old2, new2)
open('coletor_modbus.py', 'w', encoding='utf-8').write(content)
print('OK - 2 patches aplicados')
