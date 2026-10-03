"""
Modbus command driver para SGM - SENERG Trensurb.

Suporta:
- DSE7420/DSE7320 via SCF
- STEMAC ST2160 conforme manual MAN_670.060.0140_V100R03

Senha 4567 (Nivel 5 Cliente) validada em 28/06/2026 no GMG-ANCHIETA.

Regra operacional (Jacques, 03/10/2026):
- LIGAR parte o gerador EM VAZIO. O sistema nunca comanda transferencia de carga.
- O GMG so assume carga por manutencao no local ou por falta da concessionaria,
  e isso e funcao do modo Automatico do proprio ST2160.
- Por isso, sempre que o STEMAC sai do Automatico por comando remoto, um vigia
  devolve o equipamento ao Automatico:
    * por tempo: apos TEMPO_MAX_FORA_AUTO_S, manda Parada e volta para Auto;
    * por falta de rede: se a tensao da concessionaria cair, volta para Auto
      imediatamente (sem Parada), para o ST2160 assumir a carga sozinho.
"""
import logging
import threading
import time
from pymodbus.client import ModbusTcpClient
from pymodbus.exceptions import ModbusException

log = logging.getLogger(__name__)

MODBUS_PORT = 502
MODBUS_TIMEOUT = 5

# --- Vigia do Modo Remoto (STEMAC) -------------------------------------------
TEMPO_MAX_FORA_AUTO_S = 5 * 60   # tempo maximo de teste em vazio / fora do Auto
INTERVALO_VIGIA_S     = 5        # intervalo entre leituras da rede
TENSAO_REDE_MIN_V     = 180      # abaixo disso em qualquer fase = falta da concessionaria
LEITURAS_FALTA_REDE   = 2        # leituras baixas seguidas para confirmar a falta
TENTATIVAS_RETORNO    = 3        # tentativas de devolver ao Auto se o comando falhar
ST2160_REG_REDE_BASE  = 70       # input registers 71/72/73 = tensao rede L1/L2/L3 (mesmo mapa do coletor)

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
ST2160_BIT_AUTO_CARGA       = 5   # NUNCA enviado: o sistema nao comanda carga
ST2160_BIT_PARADA_REMOTA    = 12
ST2160_REG_CONTROLE_01      = 999
ST2160_BIT_ID_INVALIDO      = 0
ST2160_BIT_SENHA_INVALIDA   = 1
ST2160_ID_MATRICULA   = 0
ST2160_ID_VERIFICADOR = 0
ST2160_SENHA_NIVEL_5  = 4567


# Estado interno do Modo Remoto por IP.
# O bit 4 (MODO_REMOTO) e um toggle no ST2160: cada pulso inverte o estado.
# Obs.: o bit 4 de 3x1000 NAO reflete o modo (testado em GMG-SAOLUIS 03/10/2026).
_stemac_modo_remoto: dict = {}  # ip -> bool (True = em Modo Remoto)

# Um comando por vez em cada gerador (botao do CCO e vigia nao se atropelam)
_locks: dict = {}
_locks_guard = threading.Lock()

# Vigias ativos: ip -> threading.Event (setado = cancelar)
_vigias: dict = {}
_vigias_guard = threading.Lock()


def _lock_do(ip: str) -> threading.Lock:
    with _locks_guard:
        if ip not in _locks:
            _locks[ip] = threading.Lock()
        return _locks[ip]


def _st2160_em_remoto(ip: str) -> bool:
    return _stemac_modo_remoto.get(ip, False)


def _st2160_set_remoto(ip: str, valor: bool) -> None:
    _stemac_modo_remoto[ip] = valor


class ComandoError(Exception):
    pass


# =============================================================================
# DSE
# =============================================================================
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


# =============================================================================
# STEMAC ST2160
# =============================================================================
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


def _st2160_executar(ip, slave_id, action):
    """Executa o comando no ST2160. Chamar sempre com o lock do IP adquirido."""
    client = ModbusTcpClient(ip, port=MODBUS_PORT, timeout=MODBUS_TIMEOUT)
    registros = []
    try:
        if not client.connect():
            raise ComandoError(f"Sem conexao Modbus com {ip}")
        _st2160_login(client, ip)

        if action == "start":
            # Entra em Modo Remoto somente se ainda nao estiver nele
            if not _st2160_em_remoto(ip):
                registros.append(_st2160_pulso_bit(
                    client, ip, ST2160_BIT_MODO_REMOTO, "Entrada Modo Remoto"))
                _st2160_set_remoto(ip, True)
                time.sleep(1.0)
            else:
                log.info(f"ST2160 {ip}: ja em Modo Remoto - toggle de entrada omitido")
            # Partida EM VAZIO: somente bit 2 (bit 5 / carga nunca e enviado)
            result = client.write_registers(
                address=ST2160_REG_COMANDOS_CLIENTE, values=[1 << ST2160_BIT_PARTIDA])
            if result.isError():
                raise ComandoError(f"ST2160 {ip}: recusou Partida: {result}")
            log.info(f"ST2160 {ip}: PARTIDA EM VAZIO OK (0x{1 << ST2160_BIT_PARTIDA:04X})")
            time.sleep(0.5)
            registros.append({
                "endereco": ST2160_REG_COMANDOS_CLIENTE,
                "valores": [1 << ST2160_BIT_PARTIDA],
                "bit": ST2160_BIT_PARTIDA,
                "descricao": "Partida do GMG (em vazio)"
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


# --- Vigia -------------------------------------------------------------------
def _ler_tensao_rede(ip):
    """Retorna [L1, L2, L3] da concessionaria, ou None se a leitura falhar."""
    client = ModbusTcpClient(ip, port=MODBUS_PORT, timeout=MODBUS_TIMEOUT)
    try:
        if not client.connect():
            return None
        rb = client.read_input_registers(address=ST2160_REG_REDE_BASE, count=35)
        if rb.isError():
            return None
        return [rb.registers[1], rb.registers[2], rb.registers[3]]
    except Exception as e:
        log.warning(f"VIGIA {ip}: falha ao ler tensao da rede: {e}")
        return None
    finally:
        client.close()


def _cancelar_vigia(ip):
    with _vigias_guard:
        ev = _vigias.pop(ip, None)
    if ev:
        ev.set()


def _devolver_auto(ip, slave_id, action, motivo):
    """Executa stop ou auto com novas tentativas. Usado pelo vigia."""
    for tentativa in range(1, TENTATIVAS_RETORNO + 1):
        try:
            with _lock_do(ip):
                _st2160_executar(ip, slave_id, action)
            log.warning(f"VIGIA {ip}: {motivo} -> '{action}' executado, GMG de volta ao Automatico")
            return
        except Exception as e:
            log.error(f"VIGIA {ip}: tentativa {tentativa}/{TENTATIVAS_RETORNO} de '{action}' falhou: {e}")
            time.sleep(10)
    log.critical(f"VIGIA {ip}: NAO FOI POSSIVEL DEVOLVER AO AUTOMATICO ({motivo}). VERIFICAR NO LOCAL.")


def _vigia(ip, slave_id, cancelar):
    inicio = time.monotonic()
    baixas = 0
    log.info(f"VIGIA {ip}: iniciado (max {TEMPO_MAX_FORA_AUTO_S // 60} min fora do Auto, "
             f"rede minima {TENSAO_REDE_MIN_V} V)")
    while not cancelar.wait(INTERVALO_VIGIA_S):
        rede = _ler_tensao_rede(ip)
        if rede is not None:
            if min(rede) < TENSAO_REDE_MIN_V:
                baixas += 1
                log.warning(f"VIGIA {ip}: rede baixa {rede} V ({baixas}/{LEITURAS_FALTA_REDE})")
            else:
                baixas = 0
        if cancelar.is_set():
            return
        if baixas >= LEITURAS_FALTA_REDE:
            with _vigias_guard:
                if _vigias.get(ip) is cancelar:
                    _vigias.pop(ip, None)
            # Sem Parada: em Auto o ST2160 assume a carga sozinho
            _devolver_auto(ip, slave_id, "auto", f"FALTA DA CONCESSIONARIA {rede} V")
            return
        if time.monotonic() - inicio >= TEMPO_MAX_FORA_AUTO_S:
            with _vigias_guard:
                if _vigias.get(ip) is cancelar:
                    _vigias.pop(ip, None)
            _devolver_auto(ip, slave_id, "stop", f"tempo maximo de {TEMPO_MAX_FORA_AUTO_S // 60} min")
            return


def _iniciar_vigia(ip, slave_id):
    _cancelar_vigia(ip)
    ev = threading.Event()
    with _vigias_guard:
        _vigias[ip] = ev
    threading.Thread(target=_vigia, args=(ip, slave_id, ev),
                     name=f"vigia-{ip}", daemon=True).start()


def _enviar_stemac(ip, slave_id, action):
    # Comando manual do operador substitui qualquer vigia anterior
    if action in ("start", "manual", "stop", "auto"):
        _cancelar_vigia(ip)
    with _lock_do(ip):
        registros = _st2160_executar(ip, slave_id, action)
    # Saiu do Automatico? Liga o vigia (o prazo recomeca a cada LIGAR/MANUAL)
    if action in ("start", "manual") and _st2160_em_remoto(ip):
        _iniciar_vigia(ip, slave_id)
    return registros


def enviar_comando_gerador(ip, slave_id, action, tipo="dse"):
    """Executa o comando e devolve a lista de registros Modbus escritos."""
    if tipo == "dse":
        return _enviar_dse(ip, slave_id, action) or []
    elif tipo == "stemac":
        return _enviar_stemac(ip, slave_id, action) or []
    else:
        raise ComandoError(f"Tipo de controlador '{tipo}' desconhecido.")
