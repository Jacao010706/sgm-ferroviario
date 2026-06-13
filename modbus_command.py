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

ST2160_REG_COMANDO = 0
ST2160_REG_SENHA   = 4
ST2160_SENHA_OPERADOR = 345678
ST2160_BIT_MODO_REMOTO = 4
ST2160_BIT_PARTIDA     = 2
ST2160_BIT_PARADA      = 12

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

def _escrever_st2160_bit(client, slave_id, bit, descricao):
    valor = 1 << bit
    result = client.write_registers(address=ST2160_REG_COMANDO, values=[valor])
    if result.isError():
        raise ComandoError(f"ST2160 recusou '{descricao}' (bit {bit}): {result}")
    log.info(f"ST2160: bit {bit} '{descricao}' OK (valor={valor})")
    time.sleep(0.5)

def _enviar_stemac(ip, slave_id, action):
    client = ModbusTcpClient(ip, port=MODBUS_PORT, timeout=MODBUS_TIMEOUT)
    try:
        if not client.connect():
            raise ComandoError(f"Sem conexao Modbus com {ip}")
        result = client.write_registers(address=ST2160_REG_SENHA, values=[ST2160_SENHA_OPERADOR])
        if result.isError():
            raise ComandoError(f"ST2160 {ip}: falha ao enviar senha: {result}")
        log.info(f"ST2160 {ip}: senha OK")
        time.sleep(0.3)
        if action == "start":
            _escrever_st2160_bit(client, slave_id, ST2160_BIT_MODO_REMOTO, "Modo Remoto")
            time.sleep(0.5)
            _escrever_st2160_bit(client, slave_id, ST2160_BIT_PARTIDA, "Partida GMG")
        elif action == "stop":
            _escrever_st2160_bit(client, slave_id, ST2160_BIT_PARADA, "Parada Remota")
        elif action == "auto":
            _escrever_st2160_bit(client, slave_id, ST2160_BIT_MODO_REMOTO, "Saida Modo Remoto")
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
