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


# Estado interno do Modo Remoto por IP.
# O bit 4 (MODO_REMOTO) e um toggle no ST2160: cada pulso inverte o estado.
# Rastrear o estado evita acionar o toggle desnecessariamente e o bug de
# dupla inversao que impedia a partida/parada real dos geradores.
_stemac_modo_remoto: dict = {}  # ip -> bool (True = em Modo Remoto)


def _st2160_em_remoto(ip: str) -> bool:
    """Retorna True se o gerador no IP dado esta atualmente em Modo Remoto."""
    return _stemac_modo_remoto.get(ip, False)


def _st2160_set_remoto(ip: str, valor: bool) -> None:
    """Atualiza o estado Modo Remoto para o IP dado."""
    _stemac_modo_remoto[ip] = valor


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
        return {"endereco": DSE_REG_CONTROL_KEY, "valores": [key, complement],
                "descricao": descricao}
    except ModbusException as e:
        raise ComandoError(f"Modbus error em {ip}: {e}") from e
    finally:
        client.close()


def _enviar_dse(ip, slave_id, action):
    if action not in DSE_SCF:
        raise ComandoError(f"Acao '{action}' nao reconhecida para DSE.")
    registros = []
    if action == "start":
        registros.append(_escrever_dse_key(ip, slave_id, "manual"))
        time.sleep(1)
        registros.append(_escrever_dse_key(ip, slave_id, "start"))
        return registros
    registros.append(_escrever_dse_key(ip, slave_id, action))
    return registros


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
    return {"endereco": ST2160_REG_COMANDOS_CLIENTE, "valores": [valor],
            "bit": bit, "descricao": descricao}


def _enviar_stemac(ip, slave_id, action):
    """Executa um comando no STEMAC ST2160.

    O bit 4 (MODO_REMOTO) e um toggle de hardware: cada pulso inverte o estado
    interno do ST2160. A versao anterior pulsava o bit duas vezes no 'start'
    (uma vez sozinho, uma vez junto com o bit 2), cancelando a propria entrada
    em Modo Remoto. Agora rastreamos o estado por IP e so pulsamos o toggle
    quando uma mudanca de estado e necessaria.
    """
    client = ModbusTcpClient(ip, port=MODBUS_PORT, timeout=MODBUS_TIMEOUT)
    registros = []
    try:
        if not client.connect():
            raise ComandoError(f"Sem conexao Modbus com {ip}")
        _st2160_login(client, ip)

        if action == "start":
            if not _st2160_em_remoto(ip):
                registros.append(_st2160_pulso_bit(
                    client, ip, ST2160_BIT_MODO_REMOTO, "Entrada Modo Remoto"))
                _st2160_set_remoto(ip, True)
                time.sleep(1.0)
            else:
                log.info(f"ST2160 {ip}: ja em Modo Remoto - toggle de entrada omitido")
            result = client.write_registers(
                address=ST2160_REG_COMANDOS_CLIENTE, values=[1 << ST2160_BIT_PARTIDA])
            if result.isError():
                raise ComandoError(f"ST2160 {ip}: recusou Partida: {result}")
            log.info(f"ST2160 {ip}: PARTIDA OK (0x{1 << ST2160_BIT_PARTIDA:04X})")
            time.sleep(0.5)
            registros.append({
                "endereco": ST2160_REG_COMANDOS_CLIENTE,
                "valores": [1 << ST2160_BIT_PARTIDA],
                "bit": ST2160_BIT_PARTIDA,
                "descricao": "Partida do GMG"
            })

        elif action == "stop":
            registros.append(_st2160_pulso_bit(
                client, ip, ST2160_BIT_PARADA_REMOTA, "Parada Remota"))
            time.sleep(1.0)
            if _st2160_em_remoto(ip):
                registros.append(_st2160_pulso_bit(
                    client, ip, ST2160_BIT_MODO_REMOTO, "Saida Modo Remoto (volta para Auto)"))
                _st2160_set_remoto(ip, False)
            else:
                log.info(f"ST2160 {ip}: ja em Auto - toggle de saida omitido")

        elif action == "manual":
            if not _st2160_em_remoto(ip):
                registros.append(_st2160_pulso_bit(
                    client, ip, ST2160_BIT_MODO_REMOTO, "Entrada Modo Remoto"))
                _st2160_set_remoto(ip, True)
            else:
                log.info(f"ST2160 {ip}: ja em Modo Remoto - nenhuma acao necessaria")

        elif action == "auto":
            if _st2160_em_remoto(ip):
                registros.append(_st2160_pulso_bit(
                    client, ip, ST2160_BIT_MODO_REMOTO, "Saida Modo Remoto (volta para Auto)"))
                _st2160_set_remoto(ip, False)
            else:
                log.info(f"ST2160 {ip}: ja em Auto - nenhuma acao necessaria")

        elif action in ("ack", "reset"):
            registros.append(_st2160_pulso_bit(
                client, ip, ST2160_BIT_ACK_ALARMES, "Reconhecimento Alarmes"))
        else:
            raise ComandoError(f"Acao '{action}' nao reconhecida para ST2160.")

        return registros
    except ModbusException as e:
        raise ComandoError(f"Modbus error em {ip}: {e}") from e
    finally:
        client.close()


def enviar_comando_gerador(ip, slave_id, action, tipo="dse"):
    """Executa o comando e devolve a lista de registros Modbus escritos."""
    if tipo == "dse":
        return _enviar_dse(ip, slave_id, action) or []
    elif tipo == "stemac":
        return _enviar_stemac(ip, slave_id, action) or []
    else:
        raise ComandoError(f"Tipo de controlador '{tipo}' desconhecido.")
