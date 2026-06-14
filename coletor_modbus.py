"""
Coletor Modbus TCP - Geradores DSE7420 MKII - Trensurb
Lê dados dos 25 geradores via Modbus TCP e envia para a API do SGM Ferroviário.
Executa a cada 60 segundos.
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
INTERVALO_SEGUNDOS = 60
MODBUS_PORT = 502
MODBUS_TIMEOUT = 5

# Mapeamento: tag -> (ip, slave_id, asset_id)
GERADORES = {
    "GMG-MERCADO":      ("10.80.0.1",  22, "a600f012-21bb-4099-8ad4-b333aa4bf202"),
    "GMG-RODOVIARIA":   ("10.80.0.2",  29, "a152d185-e7f0-4ad2-82c9-186d6cc1f3fa"),
    "GMG-SAOPEDRO":     ("10.80.0.3",  30, "fb62f3ea-ce71-4be5-bf7a-e945d37a0ee0"),
    "GMG-FARRAPOS":     ("10.80.0.4",  22, "87aab616-83db-4999-9d65-5ca863dce963"),
    "GMG-AEROPORTO":    ("10.80.0.5",  22, "0dc7f43c-1f43-468b-8f06-c26ba1bda740"),
    "GMG-ANCHIETA":     ("10.80.0.6",  22, "4815b42c-85b5-4bf7-9273-4e27b2ea00f4"),
    "GMG-NITEROI":      ("10.80.0.7",  22, "39704013-9edc-4b1e-aa52-0c7ff8399b56"),
    "GMG-FATIMA":       ("10.80.0.8",  22, "446faf85-0d4f-406e-84ff-27b44d87b0d9"),
    "GMG-CANOAS":       ("10.80.0.26", 11, "5d3250ae-0640-4e45-ad25-27fdf175420e"),
    "GMG-MATHIASVELHO": ("10.80.0.10", 22, "5ab60bf2-5075-4ed2-a592-0471e5fdbe69"),
    "GMG-SAOLUIS":      ("10.80.0.11", 22, "34b49947-bf58-47ef-9e17-f00be9f46e7a"),
    "GMG-PETROBRAS":    ("10.80.0.12", 22, "f116c3c6-449e-4911-bd6f-516e739764f3"),
    "GMG-ESTEIO":       ("10.80.0.13", 13, "91375aaa-bc88-47e2-a269-999bf0aa5262"),
    "GMG-LUIZPASTEUR":  ("10.80.0.14", 10, "5add67ec-4578-42cb-be42-110c020be80b"),
    "GMG-SAPUCAIA":     ("10.80.0.15", 22, "fa52c2a7-d339-4500-8ca5-38f701caf41a"),
    "GMG-UNISINOS":     ("10.80.0.16", 16, "24a85079-fc43-44fb-ad06-e8233e878ba9"),
    "GMG-SAOLEOPOLDO":  ("10.80.0.17", 22, "edb209f2-a77d-4525-8688-dc0694734a99"),
    "GMG-RIOSINOS":     ("10.80.0.18", 22, "ae8fc3bb-bc93-4e0c-9838-81579f71e907"),
    "GMG-SANTOAFONSO":  ("10.80.0.19", 19, "50fac9e0-5706-454b-a2f4-127029c38473"),
    "GMG-INDUSTRIAL":   ("10.80.0.20", 20, "32f60fc0-968a-4c2d-b420-683ff6de533f"),
    "GMG-FENAC":        ("10.80.0.21", 21, "2a5aa59d-b389-44d4-92fd-be109fed2c6e"),
    "GMG-NOVOHAMBURGO": ("10.80.0.22", 22, "e5ed5469-2ac7-4217-8e2e-47b2864ddcbb"),
    "GMG-SUBESTACAO2":  ("10.80.0.23", 22, "568469db-f8ec-4cbc-a84e-82053dc567e4"),
    "GMG-BACIA1":       ("10.80.0.24", 22, "c6a50466-9a7c-4d8a-a073-fc325852e974"),
    "GMG-BACIA2":       ("10.80.0.25", 22, "4e29d4fb-2384-494c-b1ab-e7712fb36c72"),
}

# =============================================================================
# REGISTROS MODBUS DSE7420 MKII
# Fonte: DSE Modbus Manual - endereços base 0 (holding registers)
# =============================================================================
REG = {
    "temperatura":   1025,  # °C (direto)
    "nivel_tanque":  1027,  # % (direto)
    "bateria":       1029,  # V bateria (fator 0.1)
    "horas_funcio":  0,
    "tensao_l1":     1059,  # V gerador (fator 0.1)
    "tensao_l2":     1061,  # V gerador (fator 0.1)
    "tensao_l3":     1063,  # V gerador (fator 0.1)
    "corrente_l1":   0,
    "corrente_l2":   0,
    "corrente_l3":   0,
    "frequencia":    0,
    "potencia_kw":   0,
    "tensao_rede_l1":1067,  # V rede (fator 0.1)
    "tensao_rede_l2":1069,  # V rede (fator 0.1)
    "tensao_rede_l3":1071,  # V rede (fator 0.1)
    "freq_rede":     0,
    "status":        1025,  # bitmask estado DSE
    "rpm":           1024,  # RPM motor (0=parado)
}


def obter_token():
    """Autentica na API e retorna o token de acesso."""
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


# Registros especificos por gerador (quando diferem do padrao)
REG_STEMAC = {
    "temperatura":   57,   # C (direto)
    "nivel_tanque":  61,   # % (direto)
    "bateria":       58,   # V bateria (fator 0.1)
    "horas_funcio":  56,   # horas (direto)
    "tensao_l1":     74,   # V gerador fase-neutro
    "tensao_l2":     75,
    "tensao_l3":     76,
    "corrente_l1":   0,
    "corrente_l2":   0,
    "corrente_l3":   0,
    "frequencia":    0,
    "potencia_kw":   0,
    "tensao_rede_l1":71,   # V rede (direto)
    "tensao_rede_l2":72,
    "tensao_rede_l3":73,
    "freq_rede":     87,   # Hz rede (fator 0.01)
    "status":        1025,  # bitmask estado DSE
    "rpm":           1024,  # RPM motor (0=parado),
}

REG_CUSTOM = {
    "GMG-CANOAS": {
        "temperatura":   1025,
        "nivel_tanque":  1027,
        "bateria":       1028,
        "frequencia":    1031,
        "tensao_l1":     1033,
        "tensao_l2":     1035,
        "tensao_l3":     1037,
        "tensao_rede_l1":1067,
          "tensao_rede_l2":1069,
          "tensao_rede_l3":1071,
        "corrente_l1":   1045,
        "corrente_l2":   1047,
        "corrente_l3":   1049,
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

def ler_gerador(ip, slave_id, tag):
    """Conecta ao DSE7420 via Modbus TCP e lê os registros."""
    client = ModbusTcpClient(ip, port=MODBUS_PORT, timeout=MODBUS_TIMEOUT)
    dados = {}
    try:
        if not client.connect():
            log.warning(f"{tag} ({ip}): sem conexao Modbus")
            return None

        # Le registros conforme tipo do gerador
        is_stemac = tag in REG_CUSTOM and REG_CUSTOM[tag].get("temperatura", 1000) < 100
        if is_stemac:
            # STEMAC: lê em blocos de 40 registros
            regs_stemac = [0] * 200
            for base in [0, 35, 56, 71, 86]:
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
            if is_stemac:
                idx = offset
            else:
                idx = offset - 1000
            if 0 <= idx < len(regs):
                return regs[idx]
            return 0

        f1 = 1.0 if is_stemac else 0.1
        fv = 1.0 if is_stemac else 0.1
        ff = 0.01 if is_stemac else 0.1

        dados = {
            "status":        r(reg_map["status"]),
            "rpm":           r(24) if not is_stemac else 0,
            "tensao_l1":     r(reg_map["tensao_l1"]) * f1,
            "tensao_l2":     r(reg_map["tensao_l2"]) * f1,
            "tensao_l3":     r(reg_map["tensao_l3"]) * f1,
            "corrente_l1":   r(reg_map["corrente_l1"]) * f1,
            "corrente_l2":   r(reg_map["corrente_l2"]) * f1,
            "corrente_l3":   r(reg_map["corrente_l3"]) * f1,
            "frequencia":    r(reg_map["frequencia"]) * f1,
            "potencia_kw":   r(reg_map["potencia_kw"]) * f1,
            "temperatura":   r(reg_map["temperatura"]),
            "nivel_tanque":  r(reg_map["nivel_tanque"]),
            "bateria":       r(reg_map["bateria"]) * 0.1,
            "horas_funcio":  r(reg_map["horas_funcio"]),
            "tensao_rede_l1":r(reg_map["tensao_rede_l1"]) * fv,
            "tensao_rede_l2":r(reg_map["tensao_rede_l2"]) * fv,
            "tensao_rede_l3":r(reg_map["tensao_rede_l3"]) * fv,
            "freq_rede":     r(reg_map["freq_rede"]) * ff,
        }
        log.info(f"{tag} ({ip}): lido OK | tanque={dados['nivel_tanque']}% temp={dados['temperatura']}C")

    except ModbusException as e:
        log.error(f"{tag} ({ip}): ModbusException - {e}")
    except Exception as e:
        log.error(f"{tag} ({ip}): erro inesperado - {e}")
    finally:
        client.close()

    return dados if dados else None


def enviar_leitura(asset_id, dados, token):
    """Envia os dados lidos para a API do SGM."""
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "voltage_l1": dados.get("tensao_l1"),
        "voltage_l2": dados.get("tensao_l2"),
        "voltage_l3": dados.get("tensao_l3"),
        "grid_voltage_l1": dados.get("tensao_rede_l1"),
        "grid_voltage_l2": dados.get("tensao_rede_l2"),
        "grid_voltage_l3": dados.get("tensao_rede_l3"),
        "current_l1": dados.get("corrente_l1"),
        "current_l2": dados.get("corrente_l2"),
        "current_l3": dados.get("corrente_l3"),
        "frequency":  dados.get("frequencia"),
        "power_kw":   dados.get("potencia_kw"),
        "temperature":dados.get("temperatura"),
        "fuel_level": dados.get("nivel_tanque"),
        "runtime_hours": dados.get("horas_funcio"),
        "rpm":        dados.get("rpm", 0),
        "is_running": 1 if (dados.get("rpm", 0) > 0) else 0,
        "battery_voltage": dados.get("bateria"),
        "rpm":        dados.get("rpm", 0),
        "is_running": 1 if dados.get("rpm", 0) > 0 else 0,
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


ALERTAS_ENVIADOS = set()  # evita duplicar alertas no mesmo ciclo

def criar_alerta_combustivel(asset_id, tag, nivel, token):
    """Cria alerta de baixo combustivel se ainda nao existe um ativo."""
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "title": f"Combustivel baixo - {tag}",
        "description": f"Nivel de combustivel em {nivel}%. Necessario abastecimento.",
        "asset_id": asset_id,
        "severity": "high" if nivel < 30 else "medium",
        "source": "iot_sensor",
        "metric_name": "fuel_level",
        "metric_value": nivel,
        "threshold_value": 50.0,
    }
    try:
        r = requests.post(
            f"{API_BASE}/alerts/",
            json=payload,
            headers=headers,
            timeout=10,
        )
        if r.status_code in (200, 201):
            log.info(f"{tag}: alerta de combustivel criado ({nivel}%)")
        else:
            log.warning(f"{tag}: erro ao criar alerta - {r.status_code}: {r.text[:100]}")
    except Exception as e:
        log.error(f"{tag}: erro ao criar alerta - {e}")


# Mapeamento de alarmes STEMAC ST2160
# Registradores 3x (FC04) - cada bit representa um alarme
STEMAC_ALARMS = {
    # reg_offset (0-based), bit, descricao
    (0, 8):  'Baixa Tensao Bateria',
    (0, 10): 'Sobrecarga no GMG',
    (1, 0):  'Falha Sensor Temperatura',
    (1, 1):  'Alta Temperatura Agua',
    (1, 2):  'Alta Temperatura Agua Critica',
    (1, 3):  'Baixa Temperatura Agua',
    (1, 4):  'Pressao Baixa do Oleo',
    (1, 5):  'Emergencia Acionada',
    (1, 6):  'Falha na Partida do GMG',
    (1, 7):  'Falha na Parada do GMG',
    (6, 9):  'Nivel Baixo Combustivel',
    (6, 10): 'Nivel Baixo Combustivel',
    (6, 11): 'Nivel Super Baixo Combustivel',
    (7, 5):  'Alta Temperatura Mancal',
    (7, 8):  'Falha Fluxo Agua',
    (7, 12): 'Nivel Agua Radiador Baixo',
    (7, 15): 'Sobrevelocidade',
    (8, 0):  'Alta Temperatura Oleo',
    (8, 1):  'Pressao Baixa Oleo Externo',
    (8, 2):  'Alta Temperatura Agua Externo',
}

_alarmes_ativos_cache = set()

def ler_alarmes_stemac(ip, tag, token, asset_id):
    """Le registradores de alarme do STEMAC ST2160 e cria alertas no SGM."""
    client = ModbusTcpClient(ip, port=MODBUS_PORT, timeout=MODBUS_TIMEOUT)
    try:
        if not client.connect():
            return
        # Ler 10 registradores de alarme (3x0001 a 3x0010) via FC04
        result = client.read_input_registers(address=0, count=10)
        if result.isError():
            return
        regs = result.registers
        alarmes_ativos = []
        for (reg_idx, bit), descricao in STEMAC_ALARMS.items():
            if reg_idx < len(regs):
                if regs[reg_idx] & (1 << bit):
                    alarmes_ativos.append(descricao)
        if alarmes_ativos:
            for alarme in alarmes_ativos:
                titulo = f"{alarme} - {tag}"
                headers = {"Authorization": f"Bearer {token}"}
                payload = {
                    "title": titulo,
                    "description": f"Alarme detectado via Modbus ST2160: {alarme}",
                    "asset_id": asset_id,
                    "severity": "high" if any(x in alarme for x in ["Pressao", "Emergencia", "Sobrevelocidade", "Critica"]) else "medium",
                    "source": "iot_sensor",
                    "metric_name": "alarm",
                    "metric_value": 1,
                    "threshold_value": 0,
                }
                try:
                    requests.post(f"{API_BASE}/alerts/", json=payload, headers=headers, timeout=5)
                    log.info(f"{tag}: alarme STEMAC criado - {alarme}")
                except Exception as e:
                    log.error(f"{tag}: erro ao criar alarme STEMAC - {e}")
    except Exception as e:
        log.error(f"{tag}: erro ao ler alarmes STEMAC - {e}")
    finally:
        client.close()


STEMAC_ALARMS = {
    (0, 8):  'Baixa Tensao Bateria',
    (0, 10): 'Sobrecarga no GMG',
    (1, 0):  'Falha Sensor Temperatura',
    (1, 1):  'Alta Temperatura Agua',
    (1, 2):  'Alta Temperatura Agua Critica',
    (1, 3):  'Baixa Temperatura Agua',
    (1, 4):  'Pressao Baixa do Oleo',
    (1, 5):  'Emergencia Acionada',
    (1, 6):  'Falha na Partida do GMG',
    (6, 9):  'Nivel Baixo Combustivel',
    (6, 11): 'Nivel Super Baixo Combustivel',
    (7, 5):  'Alta Temperatura Mancal',
    (7, 8):  'Falha Fluxo Agua',
    (7, 12): 'Nivel Agua Radiador Baixo',
    (7, 15): 'Sobrevelocidade',
    (8, 0):  'Alta Temperatura Oleo',
    (8, 1):  'Pressao Baixa Oleo',
}

STEMAC_TAGS = {'GMG-AEROPORTO','GMG-ANCHIETA','GMG-NITEROI','GMG-FATIMA','GMG-MATHIASVELHO','GMG-SAOLUIS','GMG-PETROBRAS','GMG-SAPUCAIA','GMG-SAOLEOPOLDO','GMG-SUBESTACAO2'}

_alarmes_ativos_cache = set()

def ler_alarmes_stemac(ip, tag, token, asset_id):
    client = ModbusTcpClient(ip, port=MODBUS_PORT, timeout=MODBUS_TIMEOUT)
    try:
        if not client.connect():
            return
        result = client.read_input_registers(address=0, count=10)
        if result.isError():
            return
        regs = result.registers
        for (reg_idx, bit), descricao in STEMAC_ALARMS.items():
            if reg_idx < len(regs) and (regs[reg_idx] & (1 << bit)):
                titulo = f"{descricao} - {tag}"
                severity = "high" if any(x in descricao for x in ["Pressao","Emergencia","Sobrevelocidade","Critica"]) else "medium"
                payload = {
                    "title": titulo,
                    "description": f"Alarme Modbus ST2160: {descricao}",
                    "asset_id": asset_id,
                    "severity": severity,
                    "source": "iot_sensor",
                    "metric_name": "alarm",
                    "metric_value": 1,
                    "threshold_value": 0,
                }
                try:
                    headers = {"Authorization": f"Bearer {token}"}
                    if titulo not in _alarmes_ativos_cache:
                        requests.post(f"{API_BASE}/alerts/", json=payload, headers=headers, timeout=5)
                        _alarmes_ativos_cache.add(titulo)
                        log.info(f"{tag}: alarme STEMAC criado - {descricao}")
                except Exception as e:
                    log.error(f"{tag}: erro alarme STEMAC - {e}")
    except Exception as e:
        log.error(f"{tag}: erro ler alarmes STEMAC - {e}")
    finally:
        client.close()

def ciclo_coleta(token):
    """Executa um ciclo completo de coleta para todos os geradores."""
    ok = 0
    falha = 0
    for tag, (ip, slave_id, asset_id) in GERADORES.items():
        dados = ler_gerador(ip, slave_id, tag)
        if dados:
            if enviar_leitura(asset_id, dados, token):
                ok += 1
                # Ler alarmes STEMAC
                if tag in {"GMG-AEROPORTO","GMG-ANCHIETA","GMG-NITEROI","GMG-FATIMA","GMG-MATHIASVELHO","GMG-SAOLUIS","GMG-PETROBRAS","GMG-SAPUCAIA","GMG-SAOLEOPOLDO","GMG-SUBESTACAO2"}:
                    ler_alarmes_stemac(ip, tag, token, asset_id)
                nivel = dados.get("nivel_tanque", 100)
                if nivel > 0 and nivel < 50 and asset_id not in ALERTAS_ENVIADOS:
                    criar_alerta_combustivel(asset_id, tag, nivel, token)
                    ALERTAS_ENVIADOS.add(asset_id)
                elif nivel >= 50 and asset_id in ALERTAS_ENVIADOS:
                    ALERTAS_ENVIADOS.discard(asset_id)
            else:
                falha += 1
        else:
            falha += 1
        time.sleep(0.5)
    log.info(f"Ciclo concluido: {ok} OK, {falha} falhas")


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

        # Verificar secret
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

        # Detectar tipo pelo mapeamento STEMAC
        stemac_tags = {
            "GMG-AEROPORTO","GMG-ANCHIETA","GMG-NITEROI","GMG-FATIMA",
            "GMG-MATHIASVELHO","GMG-SAOLUIS","GMG-PETROBRAS","GMG-SAPUCAIA",
            "GMG-SAOLEOPOLDO","GMG-SUBESTACAO2"
        }
        tipo = "stemac" if tag in stemac_tags else "dse"

        try:
            from modbus_command import enviar_comando_gerador, ComandoError
            enviar_comando_gerador(ip, slave_id, action, tipo)
            log.info(f"Comando '{action}' executado para {tag} ({ip}) tipo={tipo}")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(_json.dumps({"ok": True, "tag": tag, "action": action}).encode())
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

def iniciar_tunnel_e_registrar(token, api_base):
    try:
        proc = _subprocess.Popen(
            ['cloudflared.exe', 'tunnel', '--url', 'http://localhost:8888'],
            stdout=_subprocess.PIPE, stderr=_subprocess.PIPE
        )
        import time as _time
        url = None
        for _ in range(30):
            line = proc.stderr.readline().decode('utf-8', errors='ignore')
            m = _re.search(r'https://[a-z0-9-]+\.trycloudflare\.com', line)
            if m:
                url = m.group(0)
                break
            _time.sleep(1)
        if url:
            try:
                r = requests.post(
                    api_base + '/iot/coletor/register',
                    json={'url': url, 'secret': 'sgm-trensurb-2026'},
                    headers={'Authorization': 'Bearer ' + token},
                    timeout=10
                )
                log.info(f'Tunnel registrado: {url} status={r.status_code}')
            except Exception as e:
                log.error(f'Erro ao registrar tunnel: {e}')
        else:
            log.warning('Nao foi possivel obter URL do tunnel')
        return proc
    except Exception as e:
        log.error(f'Erro ao iniciar cloudflared: {e}')
        return None

def main():
    log.info("=== Coletor Modbus SGM Ferroviario iniciado ===")
    t = threading.Thread(target=iniciar_servidor_http, daemon=True)
    t.start()
    token = None
    token_ciclos = 0

    _tunnel_proc = None
    while True:
        # Renova token a cada 100 ciclos (~1h40min) ou na primeira vez
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

# =============================================================================
# SERVIDOR HTTP LOCAL — recebe comandos do backend Railway
# Escuta em 0.0.0.0:8888
# POST /command  body: {"tag": "GMG-MERCADO", "action": "start"}
# =============================================================================


