"""
Coletor Modbus TCP - Geradores DSE7420 MKII - Trensurb
Lê dados dos 25 geradores via Modbus TCP e envia para a API do SGM Ferroviário.
Executa a cada 60 segundos.
"""

import time
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
    "GMG-CANOAS":       ("10.80.0.9",  11, "5d3250ae-0640-4e45-ad25-27fdf175420e"),
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
    "status":        1000,  # 0=parado, 1=manual, 2=auto, 3=teste, 4=falha
    "tensao_l1":     1002,  # V (fator 0.1)
    "tensao_l2":     1003,  # V (fator 0.1)
    "tensao_l3":     1004,  # V (fator 0.1)
    "corrente_l1":   1006,  # A (fator 0.1)
    "corrente_l2":   1007,  # A (fator 0.1)
    "corrente_l3":   1008,  # A (fator 0.1)
    "frequencia":    1010,  # Hz (fator 0.1)
    "potencia_kw":   1012,  # kW (fator 0.1)
    "temperatura":   1020,  # °C
    "nivel_tanque":  1024,  # % (0-100)
    "horas_funcio":  1026,  # horas (inteiro)
    "tensao_rede_l1":1040,  # V rede (fator 0.1)
    "tensao_rede_l2":1041,
    "tensao_rede_l3":1042,
    "freq_rede":     1044,  # Hz rede (fator 0.1)
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


def ler_gerador(ip, slave_id, tag):
    """Conecta ao DSE7420 via Modbus TCP e lê os registros."""
    client = ModbusTcpClient(ip, port=MODBUS_PORT, timeout=MODBUS_TIMEOUT)
    dados = {}
    try:
        if not client.connect():
            log.warning(f"{tag} ({ip}): sem conexao Modbus")
            return None

        # Lê bloco de registros (1000 a 1050)
        result = client.read_holding_registers(address=1000, count=50, slave=slave_id)

        if result.isError():
            log.warning(f"{tag} ({ip}): erro ao ler registros - {result}")
            return None

        regs = result.registers

        def r(offset):
            idx = offset - 1000
            if 0 <= idx < len(regs):
                return regs[idx]
            return 0

        dados = {
            "status":        r(REG["status"]),
            "tensao_l1":     r(REG["tensao_l1"]) * 0.1,
            "tensao_l2":     r(REG["tensao_l2"]) * 0.1,
            "tensao_l3":     r(REG["tensao_l3"]) * 0.1,
            "corrente_l1":   r(REG["corrente_l1"]) * 0.1,
            "corrente_l2":   r(REG["corrente_l2"]) * 0.1,
            "corrente_l3":   r(REG["corrente_l3"]) * 0.1,
            "frequencia":    r(REG["frequencia"]) * 0.1,
            "potencia_kw":   r(REG["potencia_kw"]) * 0.1,
            "temperatura":   r(REG["temperatura"]),
            "nivel_tanque":  r(REG["nivel_tanque"]),
            "horas_funcio":  r(REG["horas_funcio"]),
            "tensao_rede_l1":r(REG["tensao_rede_l1"]) * 0.1,
            "tensao_rede_l2":r(REG["tensao_rede_l2"]) * 0.1,
            "tensao_rede_l3":r(REG["tensao_rede_l3"]) * 0.1,
            "freq_rede":     r(REG["freq_rede"]) * 0.1,
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
        "asset_id": asset_id,
        "voltage_l1": dados.get("tensao_l1"),
        "voltage_l2": dados.get("tensao_l2"),
        "voltage_l3": dados.get("tensao_l3"),
        "current_l1": dados.get("corrente_l1"),
        "current_l2": dados.get("corrente_l2"),
        "current_l3": dados.get("corrente_l3"),
        "frequency":  dados.get("frequencia"),
        "power_kw":   dados.get("potencia_kw"),
        "temperature":dados.get("temperatura"),
        "fuel_level": dados.get("nivel_tanque"),
        "runtime_hours": dados.get("horas_funcio"),
    }
    try:
        r = requests.post(
            f"{API_BASE}/iot/readings",
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


def ciclo_coleta(token):
    """Executa um ciclo completo de coleta para todos os geradores."""
    ok = 0
    falha = 0
    for tag, (ip, slave_id, asset_id) in GERADORES.items():
        dados = ler_gerador(ip, slave_id, tag)
        if dados:
            if enviar_leitura(asset_id, dados, token):
                ok += 1
            else:
                falha += 1
        else:
            falha += 1
        time.sleep(0.5)  # pausa entre geradores para não sobrecarregar a rede
    log.info(f"Ciclo concluido: {ok} OK, {falha} falhas")


def main():
    log.info("=== Coletor Modbus SGM Ferroviario iniciado ===")
    token = None
    token_ciclos = 0

    while True:
        # Renova token a cada 100 ciclos (~1h40min) ou na primeira vez
        if token is None or token_ciclos >= 100:
            token = obter_token()
            token_ciclos = 0
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
