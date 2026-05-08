# SGM Ferroviário — Sistema de Gestão de Manutenção

Sistema completo de CMMS para subestações retificadoras e geradores de empresas de trens elétricos.

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                  FRONTEND WEB (Next.js)                     │
│         Dashboard │ Monitoramento │ OS │ Alertas            │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST + WebSocket
┌──────────────────────────▼──────────────────────────────────┐
│                  BACKEND API (FastAPI)                       │
│  Auth │ Assets │ Work Orders │ Maintenance │ IoT │ Reports  │
└──┬────────┬──────────────┬────────────┬────────────────────┘
   │        │              │            │
PostgreSQL  Redis        RabbitMQ    Celery
TimescaleDB Cache        Filas       Beat (scheduler)
   │                       │
   └───────────────────────┴─────────────────────────────────┐
                                                              │
     ┌──────────────────┐   ┌──────────────┐   ┌────────────┐│
     │  SCADA Bridge    │   │ IoT Gateway  │   │ERP Connector││
     │  OPC-UA + Modbus │   │ MQTT (EMQX)  │   │SAP / TOTVS ││
     └──────┬───────────┘   └──────┬───────┘   └────────────┘│
            │                      │                          │
     ┌──────▼──────────────────────▼──────────────────────────┘
     │     CAMPO: Subestações │ Geradores │ Sensores IoT      │
     │     PLCs │ RTUs │ IEDs │ Medidores │ Temperatura       │
     └──────────────────────────────────────────────────────── ┘

     ┌───────────────────────────────────────────────────────┐
     │           APP MOBILE (React Native)                   │
     │   Offline-first │ WatermelonDB │ Sync Engine          │
     │   Checklists │ Fotos │ QR Code │ Assinatura           │
     └───────────────────────────────────────────────────────┘
```

## Funcionalidades

### CMMS Core
- **Cadastro de ativos** com hierarquia (subestação → transformador → relé)
- **Planos de Manutenção Preventiva (PMP)** com frequências configuráveis
- **Ordens de Serviço** abertas manualmente ou geradas automaticamente
- **Checklists** digitais por tipo de equipamento
- **Histórico completo** de manutenções por ativo
- **KPIs**: MTTR, MTBF, disponibilidade, OEE parcial

### Monitoramento em Tempo Real
- Dashboard SCADA com dados ao vivo via WebSocket
- Gráficos de tendência de tensão, corrente, temperatura, vibração
- Alertas automáticos por violação de limiar
- Geração automática de OS a partir de alertas

### Integração SCADA
- **OPC-UA**: leitura de nós e subscrição de variáveis
- **Modbus TCP**: polling de medidores de energia e geradores
- Suporte a IEC 61850 via OPC-UA bridge
- Mapeamento de registradores para tipos de leitura padronizados

### IoT Gateway (MQTT)
- Broker EMQX com suporte a TLS e autenticação
- Processamento de payloads JSON de sensores de campo
- Thresholds configuráveis por sensor/ativo
- Alertas críticos com notificação push/email

### Integração ERP
- **SAP S/4HANA / ECC** via OData API (PM module)
- **TOTVS Protheus** via REST (módulo MNT / MA480)
- Interface genérica para outros ERPs
- Sincronização bidirecional: criação, atualização e encerramento de OS
- Consulta de estoque de peças e criação de requisições de material

### App Mobile (Offline-first)
- Banco local SQLite via WatermelonDB
- Download das OS atribuídas ao login
- Trabalho 100% offline: checklist, observações, fotos
- Fila de sincronização com retry automático ao reconectar
- Scanner de QR Code para identificação de ativos
- Captura de fotos e assinatura digital

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Backend | Python 3.12 + FastAPI |
| Banco principal | PostgreSQL 15 + TimescaleDB |
| Séries temporais (IoT) | TimescaleDB hypertables |
| Cache | Redis 7 |
| Filas | RabbitMQ 3.12 + Celery |
| SCADA | asyncua (OPC-UA) + pymodbus (Modbus TCP) |
| IoT Broker | EMQX 5.x |
| IoT Client | aiomqtt + paho-mqtt |
| ERP SAP | httpx + OData v4 |
| ERP TOTVS | httpx + TOTVS Framework REST v1 |
| Frontend | Next.js 14 + TailwindCSS + Recharts |
| Mobile | React Native 0.73 + WatermelonDB |
| Infra | Docker + Docker Compose + Nginx |

## Início Rápido

```bash
# 1. Copiar configurações
cp .env.example .env
# Editar .env com as credenciais do ambiente

# 2. Subir toda a infraestrutura
docker-compose up -d

# 3. Verificar saúde
curl http://localhost:8000/health

# 4. Acessar
# Web:        http://localhost:3000
# API Docs:   http://localhost:8000/api/docs
# RabbitMQ:   http://localhost:15672
# EMQX:       http://localhost:18083
```

## Tópicos MQTT

| Tópico | Direção | Descrição |
|---|---|---|
| `sgm/assets/{tag}/telemetry` | Sensor → SGM | Dados de telemetria |
| `sgm/assets/{tag}/status` | Sensor → SGM | Status online/offline |
| `sgm/assets/{tag}/alert` | Sensor → SGM | Alertas do dispositivo |
| `sgm/sensors/{id}/raw` | Sensor → SGM | Dados brutos |

## Payload MQTT (Telemetria)

```json
{
  "ts": "2024-01-15T10:30:00Z",
  "voltage_kv": 13.8,
  "current_a": 450.0,
  "temperature_c": 65.2,
  "power_kw": 6210.0,
  "power_factor": 0.92,
  "vibration_mm_s": 2.1,
  "oil_level_pct": 85.0,
  "fuel_level_pct": 72.0
}
```

## Variáveis de Ambiente Principais

| Variável | Descrição |
|---|---|
| `ERP_TYPE` | `sap` \| `totvs` \| `oracle` \| `generic` |
| `OPCUA_SERVER_URL` | URL do servidor OPC-UA |
| `MODBUS_HOST` | IP do equipamento Modbus |
| `VOLTAGE_MIN_KV` / `VOLTAGE_MAX_KV` | Limiares de tensão |
| `TEMP_MAX_C` | Temperatura máxima permitida |

## Estrutura de Diretórios

```
sgm-ferroviario/
├── backend/
│   └── app/
│       ├── models/          # SQLAlchemy (assets, maintenance, alerts, iot)
│       ├── api/v1/          # Rotas FastAPI
│       ├── integrations/
│       │   ├── scada/       # OPC-UA + Modbus
│       │   ├── iot/         # MQTT Gateway
│       │   └── erp/         # SAP + TOTVS + genérico
│       ├── services/        # Lógica de negócio + sync ERP
│       └── tasks/           # Celery tasks agendadas
├── frontend/                # Next.js (dashboard, monitoramento, OS)
├── mobile/                  # React Native (offline-first)
└── infra/                   # Nginx, PostgreSQL init
```
