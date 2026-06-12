import logging
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


class ComandoError(Exception):
    pass


def _escrever_dse_key(ip, slave_id, action):
    key, descricao = DSE_SCF[action]
    complement = 65535 - key
    client = ModbusTcpClient(ip, port=MODBUS_PORT, timeout=MODBUS_TIMEOUT)
    try:
        if not client.connect():
            raise ComandoError(f"Sem conexao Modbus com {ip}")
        result = client.write_registers(
            address=DSE_REG_CONTROL_KEY,
            values=[key, complement],
            slave=slave_id,
        )
        if result.isError():
            raise ComandoError(f"DSE {ip} recusou o comando '{action}': {result}")
        log.info(f"DSE {ip} [slave={slave_id}]: '{descricao}' OK (key={key})")
    except ModbusException as e:
        raise ComandoError(f"Modbus error em {ip}: {e}") from e
    finally:
        client.close()


def _enviar_dse(ip, slave_id, action):
    if action not in DSE_SCF:
        raise ComandoError(f"Acao '{action}' nao reconhecida para DSE.")
    if action == "start":
        _escrever_dse_key(ip, slave_id, "auto")
        import time; time.sleep(1)
        _escrever_dse_key(ip, slave_id, "start")
        log.info(f"{ip}: sequencia AUTO -> START enviada")
        return
    _escrever_dse_key(ip, slave_id, action)


def _enviar_stemac(ip, slave_id, action):
    raise ComandoError(
        "Comando remoto STEMAC ST2160 nao implementado. "
        "Aguardando tabela de registradores do fabricante."
    )


def enviar_comando_gerador(ip, slave_id, action, tipo="dse"):
    if tipo == "dse":
        _enviar_dse(ip, slave_id, action)
    elif tipo == "stemac":
        _enviar_stemac(ip, slave_id, action)
    else:
        raise ComandoError(f"Tipo de controlador '{tipo}' desconhecido.")
