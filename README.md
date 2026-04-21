# FL Sportsbook

Plataforma de apuestas deportivas construida con arquitectura de microservicios en NestJS, dos frontends en React, integración blockchain via ethers.js, y soporte para parlays, cashout y promociones.

---

## Arquitectura General

```
fl-sportsbook/
├── backend/                    # NestJS monorepo (6 apps + 2 libs)
│   ├── apps/
│   │   ├── sportsbook-api/     # API principal (puerto 3000)
│   │   ├── odds-ingestion/     # Ingesta de cuotas externas (puerto 3001)
│   │   ├── bet-execution/      # Ejecución de tickets (puerto 3002)
│   │   ├── grading/            # Gradación de resultados (puerto 3003)
│   │   ├── settlement/         # Liquidación blockchain (puerto 3004)
│   │   └── admin/              # Dashboard administrativo (puerto 3005)
│   ├── libs/
│   │   ├── shared-types/       # DTOs y tipos compartidos
│   │   └── prisma-lib/         # Módulo Prisma compartido
│   └── prisma/
│       └── schema.prisma       # Esquema de base de datos
├── front-sb/                   # Sportsbook web (React 19 + Vite, puerto 5173)
├── front-admin/                # Admin SPA (React 19 + Vite, puerto 5174)
├── sportsbook.postman_collection.json
└── sportsbook.postman_environment.json
```

### Aplicaciones Backend

| App | Puerto | Responsabilidad |
|-----|--------|----------------|
| **sportsbook-api** | 3000 | Eventos, cuotas, quotes, tickets, promotiones, cashout, WebSocket |
| **odds-ingestion** | 3001 | Integración con proveedor externo de cuotas |
| **bet-execution** | 3002 | Recepción y ejecución de tickets con workers BullMQ |
| **grading** | 3003 | Polling de resultados y gradación de tickets |
| **settlement** | 3004 | Liquidación on-chain y payouts a wallets |
| **admin** | 3005 | Auth JWT, audit trail, gradación manual, alertas, estadísticas |

### Stack Tecnológico

- **Backend:** NestJS 11 · TypeScript 5.7 · Prisma 6 · PostgreSQL · Redis · BullMQ · Socket.io · ethers.js 6 · JWT
- **Frontend:** React 19 · Vite · Tailwind CSS v4 · Zustand · Socket.io-client · ethers.js 6
- **Blockchain:** ethers.js para firma y envío de transacciones de liquidación

### Modelos de Datos Principales

- `Match` / `Odds` — Eventos deportivos con cuotas del proveedor
- `SportsbookEvent` / `Market` / `Selection` — Catálogo de apuestas normalizado
- `Quote` — Cotización con TTL (por defecto 20 s) antes de confirmar una apuesta
- `Ticket` / `ParlayLeg` — Apuestas simples y combinadas
- `GradingRecord` — Resultado de gradación (WIN/LOSS/VOID/REFUND/MANUAL_REVIEW)
- `SettlementJob` — Tracking de transacciones blockchain
- `Promotion` / `PromotionRedemption` — FREE_BET y ODDS_BOOST
- `AuditLog` — Historial de cambios para auditoría

---

## Requisitos Previos

- Node.js 20+
- PostgreSQL 15+ (local o Neon/Supabase)
- Redis 7+
- npm 10+

---

## Configuración Inicial

### 1. Variables de entorno

Ver [backend/SETUP.md](backend/SETUP.md) para el detalle completo de variables de entorno.

### 2. Instalar dependencias

```bash
# Backend
cd backend
npm install

# Frontend sportsbook
cd ../front-sb
npm install

# Frontend admin
cd ../front-admin
npm install
```

---

## Comandos Prisma

Ejecutar desde el directorio `backend/`:

```bash
# Generar el cliente Prisma (necesario tras cambios en schema.prisma)
npx prisma generate

# Aplicar migraciones en desarrollo (crea la DB si no existe)
npx prisma migrate dev

# Aplicar migraciones en producción
npx prisma migrate deploy

# Abrir Prisma Studio (explorador visual de la BD)
npx prisma studio

# Reset completo de la base de datos (elimina y recrea todo)
npx prisma migrate reset
```

---

## Levantar el Proyecto

### Backend — Todos los servicios en paralelo

```bash
cd backend
npm run start:all:dev
```

Esto levanta los 6 microservicios simultáneamente con hot-reload usando `concurrently`.

### Backend — Servicios individuales

```bash
cd backend

npm run start:sportsbook-api:dev   # API principal     → http://localhost:3000
npm run start:odds-ingestion:dev   # Ingesta cuotas    → http://localhost:3001
npm run start:bet-execution:dev    # Ejecución tickets → http://localhost:3002
npm run start:grading:dev          # Gradación         → http://localhost:3003
npm run start:settlement:dev       # Settlement        → http://localhost:3004
npm run start:admin:dev            # Admin API         → http://localhost:3005
```

### Frontend Sportsbook

```bash
cd front-sb
npm run dev    # → http://localhost:5173
```

### Frontend Admin

```bash
cd front-admin
npm run dev    # → http://localhost:5174
```

### Build de librerías compartidas

Si modificas `libs/shared-types` o `libs/prisma-lib`, reconstruye antes de iniciar los servicios:

```bash
cd backend
npm run build:libs
```

---

## Colección Postman

En la raíz del proyecto se incluyen dos archivos para testear todos los endpoints de la plataforma:

- `sportsbook.postman_collection.json` — Colección completa con requests organizados por flujo
- `sportsbook.postman_environment.json` — Variables de entorno preconfiguradas para desarrollo local

### Cómo importar

1. Abrir Postman
2. Ir a **File → Import**
3. Importar ambos archivos (colección + entorno)
4. Seleccionar el entorno **"Sportsbook Local"** en el selector superior derecho

### Flujos incluidos en la colección

| Carpeta | Descripción |
|---------|-------------|
| **Health Checks** | Verificar que los 6 servicios estén corriendo |
| **Admin Auth** | Login y obtención de JWT para el dashboard |
| **Feed & Catalog** | Listado de eventos y mercados disponibles |
| **Quote** | Generar una cotización con stake y selección |
| **Ticket** | Enviar una apuesta (simple o parlay) |
| **Cashout** | Solicitar cashout parcial o total de un ticket activo |
| **Promotions** | Aplicar FREE_BET u ODDS_BOOST en una apuesta |
| **Grading** | Simular gradación de resultados manualmente |
| **Settlement** | Verificar estado de liquidación blockchain |
| **Audit** | Consultar el trail de auditoría desde el admin |

> Las variables `{{base_url}}`, `{{admin_url}}`, `{{token}}`, etc. se resuelven automáticamente desde el entorno importado. El token JWT del admin se guarda en `{{admin_token}}` tras hacer el request de login.

---

## Flujo de una Apuesta (Resumen)

```
Usuario                sportsbook-api        bet-execution       grading          settlement
   |                        |                     |                  |                |
   |-- GET /events -------->|                     |                  |                |
   |<-- lista eventos ------|                     |                  |                |
   |                        |                     |                  |                |
   |-- POST /quote -------->|                     |                  |                |
   |<-- { quoteId, odds }---|                     |                  |                |
   |                        |                     |                  |                |
   |-- POST /tickets ------>|-- TICKET_CREATED -->|                  |                |
   |<-- { ticketId } -------|                     |-- grade poll --->|                |
   |                        |                     |                  |-- settle tx -->|
   |                        |                  CONFIRMED          GRADED          SETTLED
```

---

## Estructura de Fases del Proyecto

| Fase | Contenido |
|------|-----------|
| **Fase 1** | Quote Engine · Bet Placement · Integración Wallet |
| **Fase 2** | Grading Engine · Settlement App · Retries · Reconciliación |
| **Fase 3** | Admin Dashboard · JWT Auth · Audit Trail · Gradación manual · Rate limiting |
| **Fase 4** | Parlays · Mercados adicionales (BTTS/HTR/DC) · MLB/NFL/UCL/EPL · Cashout · Promotions |
