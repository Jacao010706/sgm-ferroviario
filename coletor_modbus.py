"""
Coletor Modbus TCP - Geradores DSE7420 MKII - Trensurb
Lê dados dos 25 geradores via Modbus TCP e envia para a API do SGM Ferroviário.
Executa a cada 15 segundos.
"""

import time
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
import json as _json
import requests
import logging
from pymodbus.client import ModbusTcpClient
from pymodbus.exceptions import ModbusException

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("coletor_modbus.log", encoding="utf-8"),
    ],
)
log = logging.getLogger(__name__)

# =============================================================================
# CONFIGURAÇÃO
# =============================================================================
API_BASE = "https://laudable-peace-production-09cd.up.railway.app/api/v1"
API_EMAIL = "admin2@sgm.com"
API_PASSWORD = "admin123"
INTERVALO_SEGUNDOS = 15
LIMPEZA_INTERVALO_HORAS = 24  # limpa leituras antigas a cada 24h
_ultima_limpeza = 0  # timestamp da ultima limpeza
MODBUS_PORT = 502
MODBUS_TIMEOUT = 5

# Mapeamento: tag -> (ip, slave_id, asset_id)
GERADORES = {
    "GMG-MERCADO":      ("10.80.0.1",  1,  "09840a92-13e2-4ac5-9988-35cbc1ed3be9"),
    "GMG-RODOVIARIA":   ("10.80.0.2",  2,  "b5d38303-cd04-4b6f-aae5-717e70acdfbe"),
    "GMG-SAOPEDRO":     ("10.80.0.3",  3,  "a620efdf-6826-4bf9-b724-c17f36dd9e65"),
    "GMG-FARRAPOS":     ("10.80.0.4",  4,  "1fe629e4-1432-45df-8eac-e64e682ec2a5"),
    "GMG-AEROPORTO":    ("10.80.0.5",  5,  "00189b70-fa1b-4127-9270-2f147d0c95e8"),
    "GMG-ANCHIETA":     ("10.80.0.6",  6,  "ead6e2bf-5718-4245-b45e-9e4686541163"),
    "GMG-NITEROI":      ("10.80.0.7",  7,  "9701e9d5-2965-4558-9971-622453941e9f"),
    "GMG-FATIMA":       ("10.80.0.8",  8,  "0630a8c5-d9d2-44b5-b3ef-51cd9f6bec4d"),
    "GMG-CANOAS":       ("10.80.0.9",  9,  "ba830f68-2f8d-4f9c-96be-2d305e69d924"),
    "GMG-MATHIASVELHO": ("10.80.0.10", 10, "462ad264-edab-46fa-ae6a-d9556a02281e"),
    "GMG-SAOLUIS":      ("10.80.0.11", 11, "f29b82f4-ad67-4306-a936-d2a0969d1761"),
    "GMG-PETROBRAS":    ("10.80.0.12", 12, "1a5ecc9e-29db-489f-a06d-5e300522238f"),
    "GMG-ESTEIO":       ("10.80.0.13", 13, "d945d875-e52d-4a45-9b1d-24a7737a8247"),
    "GMG-LUIZPASTEUR":  ("10.80.0.14", 14, "369ec2d9-533c-490d-aab1-b4469319c66c"),
    "GMG-SAPUCAIA":     ("10.80.0.15", 15, "ba0ac30b-1445-417a-b2df-af5c11f7a23f"),
    "GMG-UNISINOS":     ("10.80.0.16", 16, "edda6366-494b-4ef9-a0de-8b375e6a9d03"),
    "GMG-SAOLEOPOLDO":  ("10.80.0.17", 17, "05943bd6-9355-4337-8ce4-d9c79d3a5e79"),
    "GMG-RIOSINOS":     ("10.80.0.18", 18, "fe93f2af-4bb5-4376-b2c0-3e2ee7d4fe49"),
    "GMG-SANTOAFONSO":  ("10.80.0.19", 19, "2cba7fec-b47d-4c1b-8697-6a6e674f16d8"),
    "GMG-INDUSTRIAL":   ("10.80.0.20", 20, "43c2f463-eef2-467f-81af-73b7a336fa26"),
    "GMG-FENAC":        ("10.80.0.21", 21, "c5e8d594-318e-4de4-94d6-4417c09e34f7"),
    "GMG-NOVOHAMBURGO": ("10.80.0.22", 22, "7af45b8b-ffbc-4c50-96b5-97c522782ef4"),
    "GMG-SUBESTACAO2":  ("10.80.0.23", 23, "c679762c-fc6a-4316-a6bd-f2437fc90dd7"),
    "GMG-BACIA1":       ("10.80.0.24", 24, "37e190ef-601d-4c4a-a6ff-cf43d3b66b92"),
    "GMG-BACIA2":       ("10.80.0.25", 25, "1ff45722-6633-4e4a-8ca3-5f91eef43000"),
}

# =============================================================================
# REGISTROS MODBUS DSE7420 MKII
# =============================================================================
REG = {
    "temperatura":    1025,
    "nivel_tanque":   1027,
    "bateria":        1029,
    "horas_funcio":   0,
    "tensao_l1":      1033,
    "tensao_l2":      1035,
    "tensao_l3":      1037,
    "corrente_l1":    1045,
    "corrente_l2":    1047,
    "corrente_l3":    1049,
    "frequencia":     1031,
    "potencia_kw":    0,
    "tensao_rede_l1": 1067,
    "tensao_rede_l2": 1069,
    "tensao_rede_l3": 1071,
    "freq_rede":      0,
    "status":         1025,
    "rpm":            1030,
}

REG_STEMAC = {
    "temperatura":    57,
    "nivel_tanque":   61,
    "bateria":        58,
    "horas_funcio":   56,
    "tensao_l1":      31,
    "tensao_l2":      32,
    "tensao_l3":      33,
    "corrente_l1":    38,
    "corrente_l2":    39,
    "corrente_l3":    40,
    "frequencia":     47,
    "potencia_kw":    42,
    "tensao_rede_l1": 71,
    "tensao_rede_l2": 72,
    "tensao_rede_l3": 73,
    "freq_rede":      87,
    "status":         10,
    "rpm":            62,
}

REG_CUSTOM = {
    "GMG-CANOAS": {
        "temperatura":    1025,
        "nivel_tanque":   1027,
        "bateria":        1028,
        "frequencia":     1031,
        "tensao_l1":      1033,
        "tensao_l2":      1035,
        "tensao_l3":      1037,
        "tensao_rede_l1": 1067,
        "tensao_rede_l2": 1069,
        "tensao_rede_l3": 1071,
    "corrente_l1":    1045,
        "corrente_l2":    1047,
        "corrente_l3":    1049,
    },
    "GMG-AEROPORTO":    {**REG_STEMAC},
    "GMG-ANCHIETA":     {**REG_STEMAC},
    "GMG-NITEROI":      {**REG_STEMAC},
    "GMG-FATIMA":       {**REG_STEMAC},
    "GMG-MATHIASVELHO": {**REG_STEMAC},
    "GMG-SAOLUIS":      {**REG_STEMAC},
    "GMG-PETROBRAS":    {**REG_STEMAC},
    "GMG-SAPUCAIA":     {**REG_STEMAC},
    "GMG-SAOLEOPOLDO":  {**REG_STEMAC},
    "GMG-SUBESTACAO2":  {**REG_STEMAC},
}

STEMAC_TAGS = {
    "GMG-AEROPORTO", "GMG-ANCHIETA", "GMG-NITEROI", "GMG-FATIMA",
    "GMG-MATHIASVELHO", "GMG-SAOLUIS", "GMG-PETROBRAS", "GMG-SAPUCAIA",
    "GMG-SAOLEOPOLDO", "GMG-SUBESTACAO2"
}

STEMAC_ALARMS = {
    (0, 8):  "Baixa Tensao Bateria",
    (0, 10): "Sobrecarga no GMG",
    (1, 0):  "Falha Sensor Temperatura",
    (1, 1):  "Alta Temperatura Agua",
    (1, 2):  "Alta Temperatura Agua Critica",
    (1, 3):  "Baixa Temperatura Agua",
    (1, 4):  "Pressao Baixa do Oleo",
    (1, 5):  "Emergencia Acionada",
    (1, 6):  "Falha na Partida do GMG",
    (6, 9):  "Nivel Baixo Combustivel",
    (6, 11): "Nivel Super Baixo Combustivel",
    (7, 5):  "Alta Temperatura Mancal",
    (7, 8):  "Falha Fluxo Agua",
    (7, 12): "Nivel Agua Radiador Baixo",
    (7, 15): "Sobrevelocidade",
    (8, 0):  "Alta Temperatura Oleo",
    (8, 1):  "Pressao Baixa Oleo",
}

# =============================================================================
# CACHE DE ALERTAS ATIVOS — consultado na API a cada ciclo
# Evita duplicar alertas para o mesmo problema
# =============================================================================
_alertas_ativos_cache: set = set()  # titulos de alertas ativos na API
_cache_ultima_atualizacao: float = 0.0
CACHE_TTL = 60  # segundos entre atualizações do cache


def atualizar_cache_alertas(token: str) -> None:
    """Busca todos os alertas ativos na API e atualiza o cache local."""
    global _alertas_ativos_cache, _cache_ultima_atualizacao
    try:
        headers = {"Authorization": f"Bearer {token}"}
        r = requests.get(
            f"{API_BASE}/alerts/",
            params={"status": "active", "limit": 500},
            headers=headers,
            timeout=10,
        )
        if r.status_code == 200:
            alertas = r.json()
            _alertas_ativos_cache = {a.get("title", "") for a in alertas}
            _cache_ultima_atualizacao = time.time()
    except Exception as e:
        log.warning(f"Erro ao atualizar cache de alertas: {e}")


def alerta_ja_existe(titulo: str) -> bool:
    """Verifica se já existe um alerta ativo com este título no cache."""
    return titulo in _alertas_ativos_cache


def registrar_alerta_no_cache(titulo: str) -> None:
    """Adiciona um título ao cache após criação."""
    _alertas_ativos_cache.add(titulo)


# =============================================================================
# AUTENTICAÇÃO
# =============================================================================
def obter_token():
    try:
        r = requests.post(
            f"{API_BASE}/auth/login",
            json={"email": API_EMAIL, "password": API_PASSWORD},
            timeout=10,
        )
        r.raise_for_status()
        token = r.json().get("access_token")
        log.info("Token obtido com sucesso")
        return token
    except Exception as e:
        log.error(f"Falha ao obter token: {e}")
        return None


# =============================================================================
# LEITURA MODBUS
# =============================================================================
def ler_gerador(ip, slave_id, tag):
    client = ModbusTcpClient(ip, port=MODBUS_PORT, timeout=MODBUS_TIMEOUT)
    dados = {}
    try:
        if not client.connect():
            log.warning(f"{tag} ({ip}): sem conexao Modbus")
            return "no_comm"

        is_stemac = tag in REG_CUSTOM and REG_CUSTOM[tag].get("temperatura", 1000) < 100

        if is_stemac:
            regs_stemac = [0] * 200
            for base in [0, 30, 55, 70, 85]:
                rb = client.read_input_registers(address=base, count=35)
                if not rb.isError():
                    for i, v in enumerate(rb.registers):
                        regs_stemac[base + i] = v
            class FakeResult:
                def __init__(self, regs):
                    self.registers = regs
                def isError(self): return False
            result = FakeResult(regs_stemac)
        else:
            result = client.read_holding_registers(address=1000, count=80)

        if result.isError():
            log.warning(f"{tag} ({ip}): erro ao ler registros - {result}")
            return None

        regs = result.registers
        reg_map = {**REG, **REG_CUSTOM.get(tag, {})}

        def r(offset):
            if offset == 0:
                return 0
            idx = offset if is_stemac else offset - 1000
            if 0 <= idx < len(regs):
                return regs[idx]
            return 0

        f1 = 1.0 if is_stemac else 0.1
        fv = 1.0 if is_stemac else 0.1
        ff = 0.1 if is_stemac else 0.1
        fq = 0.01 if is_stemac else 0.1

        rpm = r(1030) if not is_stemac else (r(62) if ((r(10) & 0x0100) and not (r(21) & 0x0080)) else 0)
        potencia_total = round((r(1053) + r(1055) + r(1057)) * 0.001, 2) if not is_stemac else 0
        if not is_stemac and potencia_total > 0:
            vl1 = r(1033) * 0.1
            vl2 = r(1035) * 0.1
            vl3 = r(1037) * 0.1
            il1 = r(1045) * 0.1
            il2 = r(1047) * 0.1
            il3 = r(1049) * 0.1
            kva_total = round((vl1*il1 + vl2*il2 + vl3*il3) / 1000, 2)
            kvar_total = round((kva_total**2 - potencia_total**2)**0.5, 2) if kva_total >= potencia_total else 0
            fp_total = round(potencia_total / kva_total, 2) if kva_total > 0 else 0
        elif is_stemac and ((r(10) & 0x0100) and not (r(21) & 0x0080)):
            potencia_total = r(42) * 1.0
            kva_total = r(43) * 1.0
            _kvar = r(44)
            kvar_total = (_kvar - 65536) * 1.0 if _kvar > 32767 else _kvar * 1.0
            fp_total = r(46) * 0.01
        else:
            kva_total = 0
            kvar_total = 0
            fp_total = 0
        stemac_running = bool((r(10) & 0x0100) and not (r(21) & 0x0080)) if is_stemac else False


        is_running = stemac_running if is_stemac else rpm > 0

        dados = {
            "status":         r(reg_map["status"]),
            "rpm":            rpm,
            "stemac_running": stemac_running,
            "tensao_l1":      r(reg_map["tensao_l1"]) * f1 if is_running else 0,
            "tensao_l2":      r(reg_map["tensao_l2"]) * f1 if is_running else 0,
            "tensao_l3":      r(reg_map["tensao_l3"]) * f1 if is_running else 0,
            "corrente_l1":    r(reg_map["corrente_l1"]) * f1,
            "corrente_l2":    r(reg_map["corrente_l2"]) * f1,
            "corrente_l3":    r(reg_map["corrente_l3"]) * f1,
            "frequencia":     r(reg_map["frequencia"]) * fq,
            "potencia_kw":    potencia_total,
            "kva_total":      kva_total,
            "kvar_total":     kvar_total,
            "fp_total":       fp_total,
            "temperatura":    r(reg_map["temperatura"]),
            "nivel_tanque":   r(reg_map["nivel_tanque"]),
            "external_tank":  0 if ((r(1059) >> 4) & 0xF) == 0 else 1,  # FLEX_D: d=0->BAIXO, d>0->CHEIO
            "bateria":        r(reg_map["bateria"]) * 0.1,
            "horas_funcio":   r(reg_map["horas_funcio"]),
            "tensao_rede_l1": r(reg_map["tensao_rede_l1"]) * fv,
            "tensao_rede_l2": r(reg_map["tensao_rede_l2"]) * fv,
            "tensao_rede_l3": r(reg_map["tensao_rede_l3"]) * fv,
            "freq_rede":      r(reg_map["freq_rede"]) * ff,
        }
        log.info(f"{tag} ({ip}): lido OK | tanque={dados['nivel_tanque']}% temp={dados['temperatura']}C")

    except ModbusException as e:
        log.error(f"{tag} ({ip}): ModbusException - {e}")
    except Exception as e:
        log.error(f"{tag} ({ip}): erro inesperado - {e}")
    finally:
        client.close()

    return dados if dados else None


# =============================================================================
# ENVIO DE LEITURA
# =============================================================================
def enviar_leitura(asset_id, dados, token):
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "voltage_l1":      dados.get("tensao_l1"),
        "voltage_l2":      dados.get("tensao_l2"),
        "voltage_l3":      dados.get("tensao_l3"),
        "grid_voltage_l1": dados.get("tensao_rede_l1"),
        "grid_voltage_l2": dados.get("tensao_rede_l2"),
        "grid_voltage_l3": dados.get("tensao_rede_l3"),
        "current_l1":      dados.get("corrente_l1"),
        "current_l2":      dados.get("corrente_l2"),
        "current_l3":      dados.get("corrente_l3"),
        "frequency":       dados.get("frequencia"),
        "power_kw":        dados.get("potencia_kw"),
        "power_kva":       dados.get("kva_total"),
        "power_kvar":      dados.get("kvar_total"),
        "power_factor":    dados.get("fp_total"),
        "temperature":     dados.get("temperatura"),
        "fuel_level":      dados.get("nivel_tanque"),
        "external_tank":   dados.get("external_tank"),
        "runtime_hours":   dados.get("horas_funcio"),
        "rpm":             dados.get("rpm", 0),
        "is_running":      1 if (dados.get("rpm", 0) > 0 or dados.get("stemac_running", False)) else 0,
        "battery_voltage": dados.get("bateria"),
    }
    try:
        r = requests.post(
            f"{API_BASE}/iot/readings/{asset_id}",
            json=payload,
            headers=headers,
            timeout=10,
        )
        if r.status_code in (200, 201):
            return True
        else:
            log.warning(f"API retornou {r.status_code}: {r.text[:100]}")
            return False
    except Exception as e:
        log.error(f"Erro ao enviar leitura: {e}")
        return False


# =============================================================================
# ALERTAS — com deduplicação via cache da API
# =============================================================================
# Controle de combustível: quando normaliza, remove do cache para permitir
# novo alerta se voltar a cair
_combustivel_normalizado: set = set()


def criar_alerta(asset_id, titulo, descricao, severity, metric_name, metric_value, threshold, token):
    """Cria um alerta na API apenas se não existir um ativo com o mesmo título."""
    if alerta_ja_existe(titulo):
        return
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "title": titulo,
        "description": descricao,
        "asset_id": asset_id,
        "severity": severity,
        "source": "iot_sensor",
        "metric_name": metric_name,
        "metric_value": metric_value,
        "threshold_value": threshold,
    }
    try:
        r = requests.post(f"{API_BASE}/alerts/", json=payload, headers=headers, timeout=10)
        if r.status_code in (200, 201):
            registrar_alerta_no_cache(titulo)
            log.info(f"Alerta criado: {titulo}")
        else:
            log.warning(f"Erro ao criar alerta {titulo}: {r.status_code}")
    except Exception as e:
        log.error(f"Erro ao criar alerta {titulo}: {e}")


def verificar_combustivel(asset_id, tag, nivel, token):
    """Cria alerta de combustível baixo se necessário, uma única vez."""
    titulo = f"Combustivel baixo - {tag}"
    if nivel > 0 and nivel < 50:
        criar_alerta(
            asset_id, titulo,
            f"Nivel de combustivel em {nivel}%. Necessario abastecimento.",
            "critical" if nivel < 40 else "medium",
            "fuel_level", nivel, 50.0, token
        )
        _combustivel_normalizado.discard(asset_id)
    elif nivel >= 50 and asset_id not in _combustivel_normalizado:
        # Combustível normalizado — remove do cache para permitir novo alerta no futuro
        _alertas_ativos_cache.discard(titulo)
        _combustivel_normalizado.add(asset_id)


def resolver_alerta(titulo, token):
    """Resolve alertas ativos com o titulo informado."""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        r = requests.get(f"{API_BASE}/alerts/", params={"status": "active", "limit": 100}, headers=headers, timeout=10)
        if r.status_code == 200:
            for alert in r.json():
                if alert.get("title") == titulo and alert.get("status") == "active":
                    requests.post(f"{API_BASE}/alerts/{alert['id']}/resolve", headers=headers, timeout=10)
                    log.info(f"Alerta resolvido automaticamente: {titulo}")
    except Exception as e:
        log.error(f"Erro ao resolver alerta: {e}")

def ler_alarmes_stemac(ip, tag, token, asset_id):
    """Lê alarmes do STEMAC ST2160 e cria alertas sem duplicar."""
    client = ModbusTcpClient(ip, port=MODBUS_PORT, timeout=MODBUS_TIMEOUT)
    try:
        if not client.connect():
            return
        result = client.read_input_registers(address=0, count=10)
        if result.isError():
            return
        regs = result.registers
        for (reg_idx, bit), descricao in STEMAC_ALARMS.items():
            titulo = f"{descricao} - {tag}"
            if reg_idx < len(regs) and (regs[reg_idx] & (1 << bit)):
                severity = "high" if any(x in descricao for x in ["Pressao", "Emergencia", "Sobrevelocidade", "Critica"]) else "medium"
                criar_alerta(
                    asset_id, titulo,
                    f"Alarme Modbus ST2160: {descricao}",
                    severity, "alarm", 1, 0, token
                )
            else:
                resolver_alerta(titulo, token)
    except Exception as e:
        log.error(f"{tag}: erro ler alarmes STEMAC - {e}")
    finally:
        client.close()


# =============================================================================
# CICLO DE COLETA
# =============================================================================
def ciclo_coleta(token):
    global _cache_ultima_atualizacao

    # Atualiza cache de alertas ativos a cada CACHE_TTL segundos
    if time.time() - _cache_ultima_atualizacao > CACHE_TTL:
        atualizar_cache_alertas(token)

    ok = 0
    falha = 0
    for tag, (ip, slave_id, asset_id) in GERADORES.items():
        dados = ler_gerador(ip, slave_id, tag)
        titulo_comm = f"Falha de Comunicacao - {tag}"
        if dados and dados != "no_comm":
            resolver_alerta(titulo_comm, token)
            if enviar_leitura(asset_id, dados, token):
                ok += 1
                if tag in STEMAC_TAGS:
                    ler_alarmes_stemac(ip, tag, token, asset_id)
                verificar_combustivel(asset_id, tag, dados.get("nivel_tanque", 100), token)
            else:
                falha += 1
        elif dados == "no_comm":
            criar_alerta(asset_id, titulo_comm, f"Sem conexao Modbus com {tag} ({ip})", "high", "alarm", 1, 0, token)
            falha += 1
        else:
            falha += 1
        time.sleep(0.5)
    log.info(f"Ciclo concluido: {ok} OK, {falha} falhas")
    global _ultima_limpeza
    agora = time.time()
    if agora - _ultima_limpeza > LIMPEZA_INTERVALO_HORAS * 3600:
        try:
            r = requests.post(f"{API_BASE}/iot/maintenance/cleanup", params={"days": 2}, headers={"Authorization": f"Bearer {token}"}, timeout=30)
            if r.status_code == 200:
                log.info(f"Limpeza automatica: {r.json().get('deleted', 0)} leituras removidas")
            _ultima_limpeza = agora
        except Exception as e:
            log.warning(f"Erro na limpeza automatica: {e}")


# =============================================================================
# SERVIDOR HTTP DE COMANDOS
# =============================================================================
COMANDO_SECRET = "sgm-trensurb-2026"

class CommandHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        log.info(f"HTTP {args}")

    def do_POST(self):
        if self.path != "/command":
            self.send_response(404)
            self.end_headers()
            return
        length = int(self.headers.get("Content-Length", 0))
        body = _json.loads(self.rfile.read(length))
        if body.get("secret") != COMANDO_SECRET:
            self.send_response(401)
            self.end_headers()
            self.wfile.write(b'{"error":"unauthorized"}')
            return
        tag    = body.get("tag")
        action = body.get("action")
        if not tag or not action:
            self.send_response(400)
            self.end_headers()
            self.wfile.write(b'{"error":"tag e action obrigatorios"}')
            return
        config = GERADORES.get(tag)
        if not config:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'{"error":"gerador nao encontrado"}')
            return
        ip, slave_id, asset_id = config
        tipo = "stemac" if tag in STEMAC_TAGS else "dse"
        try:
            from modbus_command import enviar_comando_gerador
            _registros = enviar_comando_gerador(ip, slave_id, action, tipo)
            log.info(f"Comando '{action}' executado para {tag} ({ip}) tipo={tipo}")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(_json.dumps({"ok": True, "tag": tag, "action": action,
                                          "registros_modbus": _registros}).encode())
        except Exception as e:
            log.error(f"Erro ao executar comando {action} em {tag}: {e}")
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(_json.dumps({"error": str(e)}).encode())

    def do_GET(self):
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"status":"ok","service":"sgm-coletor"}')
        else:
            self.send_response(404)
            self.end_headers()


def iniciar_servidor_http():
    server = HTTPServer(("0.0.0.0", 8888), CommandHandler)
    log.info("Servidor HTTP de comandos iniciado em 0.0.0.0:8888")
    server.serve_forever()


import subprocess as _subprocess
import re as _re
import atexit as _atexit


def _matar_cloudflared_orfaos():
    """Encerra tuneis cloudflared deixados por execucoes anteriores.

    O coletor e reiniciado com kill forcado, que nao roda atexit: o
    cloudflared filho sobrevive ao pai e segue servindo um tunel para a
    porta 8888. Como a API guarda apenas a ultima URL registrada, ela pode
    acabar apontando para um tunel orfao -- as leituras continuam subindo
    (o coletor e quem chama a API), mas os comandos aos geradores, que
    percorrem o caminho inverso, caem num tunel sem dono e falham.

    Limpar na partida e o unico ponto confiavel, justamente porque o kill
    forcado impede qualquer limpeza no encerramento.
    """
    try:
        r = _subprocess.run(
            ["taskkill", "/F", "/IM", "cloudflared.exe"],
            capture_output=True, check=False,
        )
        if r.returncode == 0:
            log.info("Tuneis cloudflared anteriores encerrados")
    except Exception as e:
        log.warning(f"Falha ao limpar cloudflared orfaos: {e}")


def iniciar_tunnel_e_registrar(token, api_base):
    try:
        _matar_cloudflared_orfaos()
        proc = _subprocess.Popen(
            ["cloudflared.exe", "tunnel", "--url", "http://localhost:8888"],
            stdout=_subprocess.PIPE, stderr=_subprocess.PIPE
        )
        # Cobre o encerramento limpo (Ctrl+C, fechar a janela). O kill
        # forcado nao passa por aqui -- para esse caso vale a limpeza na
        # partida, acima.
        _atexit.register(lambda: proc.terminate())
        import time as _time
        url = None
        for _ in range(30):
            line = proc.stderr.readline().decode("utf-8", errors="ignore")
            m = _re.search(r"https://[a-z0-9-]+\.trycloudflare\.com", line)
            if m:
                url = m.group(0)
                break
            _time.sleep(1)
        if url:
            try:
                r = requests.post(
                    api_base + "/iot/coletor/register",
                    json={"url": url, "secret": "sgm-trensurb-2026"},
                    headers={"Authorization": "Bearer " + token},
                    timeout=10,
                )
                log.info(f"Tunnel registrado: {url} status={r.status_code}")
            except Exception as e:
                log.error(f"Erro ao registrar tunnel: {e}")
        else:
            log.warning("Nao foi possivel obter URL do tunnel")
        return proc
    except Exception as e:
        log.error(f"Erro ao iniciar cloudflared: {e}")
        return None


# =============================================================================
# MAIN
# =============================================================================
def main():
    log.info("=== Coletor Modbus SGM Ferroviario iniciado ===")
    t = threading.Thread(target=iniciar_servidor_http, daemon=True)
    t.start()
    token = None
    token_ciclos = 0
    _tunnel_proc = None
    while True:
        if token is None or token_ciclos >= 100:
            token = obter_token()
            token_ciclos = 0
            if _tunnel_proc is None and token:
                _tunnel_proc = iniciar_tunnel_e_registrar(token, API_BASE)
            if token is None:
                log.error("Sem token - aguardando 30s para tentar novamente")
                time.sleep(30)
                continue
        ciclo_coleta(token)
        token_ciclos += 1
        log.info(f"Aguardando {INTERVALO_SEGUNDOS}s ate proximo ciclo...")
        time.sleep(INTERVALO_SEGUNDOS)


if __name__ == "__main__":
    main()