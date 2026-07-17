"""
Modbus command driver para SGM Ferroviario - SENERG Trensurb.

Suporta:
- DSE7420/DSE7320 via SCF
- STEMAC ST2160 conforme manual MAN_670.060.0140_V100R03

Senha 4567 (Nivel 5 Cliente) validada em 28/06/2026 no GMG-ANCHIETA.
"""
import logging
import time
from pymodbus.client import ModbusTcpClient
from pymodbus.exceptions import ModbusException

log = logging.getLogger(__name__)

MODBUS_PORT = 502
MODBUS_TIMEOUT = 5

DSE_SCF = {
    "stop":   (35700, "Select Stop mode"),
    "auto":   (35701, "Select Auto mode"),
    "manual": (35702, "Select Manual mode"),
    "start":  (35705, "Start engine"),
    "mute":   (35706, "Mute alarm"),
    "reset":  (35707, "Reset alarms"),
}
DSE_REG_CONTROL_KEY = 4104
DSE_REG_COMPLEMENT  = 4105

ST2160_REG_COMANDOS_CLIENTE = 0
ST2160_REG_ID_MATRICULA     = 2
ST2160_REG_ID_VERIFICADOR   = 3
ST2160_REG_SENHA            = 4
ST2160_BIT_PARTIDA          = 2
ST2160_BIT_ACK_ALARMES      = 3
ST2160_BIT_MODO_REMOTO      = 4
ST2160_BIT_AUTO_CARGA       = 5
ST2160_BIT_PARADA_REMOTA    = 12
ST2160_REG_CONTROLE_01      = 999
ST2160_BIT_ID_INVALIDO      = 0
ST2160_BIT_SENHA_INVALIDA   = 1
ST2160_ID_MATRICULA   = 0
ST2160_ID_VERIFICADOR = 0
ST2160_SENHA_NIVEL_5  = 4567


class ComandoError(Exception):
    pass


def _escrever_dse_key(ip, slave_id, action):
    key, descricao = DSE_SCF[action]
    complement = 65535 - key
    client = ModbusTcpClient(ip, port=MODBUS_PORT, timeout=MODBUS_TIMEOUT)
    try:
        if not client.connect():
            raise ComandoError(f"Sem conexao Modbus com {ip}")
        result = client.write_registers(address=DSE_REG_CONTROL_KEY, values=[key, complement])
        if result.isError():
            raise ComandoError(f"DSE {ip} recusou '{action}': {result}")
        log.info(f"DSE {ip} [slave={slave_id}]: '{descricao}' OK")
    except ModbusException as e:
        raise ComandoError(f"Modbus error em {ip}: {e}") from e
    finally:
        client.close()


def _enviar_dse(ip, slave_id, action):
    if action not in DSE_SCF:
        raise ComandoError(f"Acao '{action}' nao reconhecida para DSE.")
    if action == "start":
        _escrever_dse_key(ip, slave_id, "manual")
        time.sleep(1)
        _escrever_dse_key(ip, slave_id, "start")
        return
    _escrever_dse_key(ip, slave_id, action)


def _st2160_login(client, ip):
    log.info(f"ST2160 {ip}: enviando login (ID={ST2160_ID_MATRICULA})")
    result = client.write_registers(
        address=ST2160_REG_ID_MATRICULA,
        values=[ST2160_ID_MATRICULA, ST2160_ID_VERIFICADOR, ST2160_SENHA_NIVEL_5]
    )
    if result.isError():
        raise ComandoError(f"ST2160 {ip}: falha ao escrever login: {result}")
    time.sleep(0.5)
    result = client.read_input_registers(address=ST2160_REG_CONTROLE_01, count=1)
    if result.isError():
        log.warning(f"ST2160 {ip}: nao foi possivel ler 3x1000: {result}")
        return
    palavra = result.registers[0]
    id_invalido = bool(palavra & (1 << ST2160_BIT_ID_INVALIDO))
    senha_invalida = bool(palavra & (1 << ST2160_BIT_SENHA_INVALIDA))
    if id_invalido or senha_invalida:
        partes = []
        if id_invalido: partes.append("ID invalido")
        if senha_invalida: partes.append("Senha invalida")
        raise ComandoError(f"ST2160 {ip}: login recusado - {', '.join(partes)} (3x1000=0x{palavra:04X})")
    log.info(f"ST2160 {ip}: login OK (3x1000=0x{palavra:04X})")


def _st2160_pulso_bit(client, ip, bit, descricao):
    valor = 1 << bit
    result = client.write_registers(address=ST2160_REG_COMANDOS_CLIENTE, values=[valor])
    if result.isError():
        raise ComandoError(f"ST2160 {ip}: recusou '{descricao}' (bit {bit}): {result}")
    log.info(f"ST2160 {ip}: bit {bit} '{descricao}' OK (valor={valor})")
    time.sleep(0.5)


def _enviar_stemac(ip, slave_id, action):
    client = ModbusTcpClient(ip, port=MODBUS_PORT, timeout=MODBUS_TIMEOUT)
    try:
        if not client.connect():
            raise ComandoError(f"Sem conexao Modbus com {ip}")
        _st2160_login(client, ip)
        if action == "start":
            _st2160_pulso_bit(client, ip, ST2160_BIT_MODO_REMOTO, "Chamada Modo Remoto")
            time.sleep(1.0)
            _st2160_pulso_bit(client, ip, ST2160_BIT_PARTIDA, "Partida do GMG")
        elif action == "stop":
            _st2160_pulso_bit(client, ip, ST2160_BIT_PARADA_REMOTA, "Parada Remota")
        elif action == "manual":
            _st2160_pulso_bit(client, ip, ST2160_BIT_MODO_REMOTO, "Chamada Modo Remoto")
        elif action == "auto":
            _st2160_pulso_bit(client, ip, ST2160_BIT_AUTO_CARGA, "GMG AUTO Assumindo Carga")
        elif action in ("ack", "reset"):
            _st2160_pulso_bit(client, ip, ST2160_BIT_ACK_ALARMES, "Reconhecimento Alarmes")
        else:
            raise ComandoError(f"Acao '{action}' nao reconhecida para ST2160.")
    except ModbusException as e:
        raise ComandoError(f"Modbus error em {ip}: {e}") from e
    finally:
        client.close()


def enviar_comando_gerador(ip, slave_id, action, tipo="dse"):
    if tipo == "dse":
        _enviar_dse(ip, slave_id, action)
    elif tipo == "stemac":
        _enviar_stemac(ip, slave_id, action)
    else:
        raise ComandoError(f"Tipo de controlador '{tipo}' desconhecido.")