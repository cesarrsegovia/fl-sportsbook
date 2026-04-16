# Sportsbook Platform v1 — Contexto Fase 0 (Completada)

## Fecha: 2026-04-13

---

## Objetivo del proyecto

Transformar el monorepo `fl-sportsbook` en un **Sportsbook Platform v1 completo**, no-custodial, con bet placement blockchain, grading engine y settlement directo a wallet.

**Stack:**
- Backend: NestJS 11 + TypeScript + Prisma 6 + PostgreSQL + Redis + Socket.io
- Frontend: React 19 + Vite 6 + TypeScript + Tailwind CSS v4 + Zustand 5

---

## Fases del proyecto

| Fase | Descripción | Estado |
|------|-------------|--------|
| **Fase 0** | Refactor estructural — preparar monorepo para 6 apps | **COMPLETADA** |
| Fase 1 | Foundations: catálogo normalizado + quote + bet placement | Pendiente |
| Fase 2 | Resolución y settlement | Pendiente |
| Fase 3 | Admin dashboard y hardening | Pendiente |
| Fase 4 | Expansión post-launch (parlays, más mercados) | Out of scope v1 |

---

## Fase 0 — Lo que se hizo

### 0.1 — nest-cli.json → multi-project
`backend/nest-cli.json` convertido a arquitectura multi-app NestJS con 6 proyectos:
- `sportsbook-api` (puerto 3000) — app principal, contiene todo el código existente
- `odds-ingestion` (3001)
- `bet-execution` (3002)
- `grading` (3003)
- `settlement` (3004)
- `admin` (3005)

### 0.2 — Migración src/ → apps/sportsbook-api/src/
Todo el contenido de `backend/src/` fue copiado a `backend/apps/sportsbook-api/src/`.  
Módulos migrados: `app.module.ts`, `main.ts`, `sports/`, `odds/`, `prisma/`, `websocket/`.  
Los imports relativos internos no cambiaron (siguen funcionando).

### 0.3 — libs/types → libs/shared-types
- Renombrado `backend/libs/types/` → `backend/libs/shared-types/`
- `package.json` actualizado: `"name": "@sportsbook/shared-types"`
- `tsconfig.json` paths: `@sportsbook/shared-types` → `./libs/shared-types/index.ts`
- `backend/package.json` dependency actualizada
- `front-sb/package.json` dependency actualizada
- Todos los imports en `backend/apps/` y `front-sb/src/` actualizados de `@sportsbook/types` → `@sportsbook/shared-types`

**Archivos front-sb actualizados:**
- `front-sb/src/components/LibertadoresDashboard.tsx`
- `front-sb/src/store/useStore.ts`

### 0.4 — Scaffolding de 5 apps nuevas
Cada app en `backend/apps/{app-name}/src/` tiene:
- `{app-name}.module.ts` — módulo NestJS mínimo
- `main.ts` — arranca en su puerto correspondiente
- `tsconfig.app.json` — extiende `../../tsconfig.json`

### 0.5 — libs/prisma como librería compartida
Nueva lib en `backend/libs/prisma/src/`:
- `prisma.service.ts` — extiende PrismaClient
- `prisma.module.ts` — `@Global()` module
- `index.ts` — re-exports
- `package.json` — `"name": "@sportsbook/prisma"`

Path en tsconfig: `@sportsbook/prisma` → `./libs/prisma/src/index.ts`

> **Nota:** `apps/sportsbook-api/src/prisma/` sigue existiendo y funcional (no se eliminó para no romper nada). En Fase 1 se puede migrar para usar `@sportsbook/prisma`.

### 0.6 — Schema Prisma extendido
`prisma/schema.prisma` — 3 modelos existentes intactos + 8 nuevos:

**Nuevos modelos:**
- `SportsbookEvent` — normaliza Match para sportsbook, tiene `lockTime` (startTime - 5 min)
- `Market` — mercados por evento (MATCH_WINNER, OVER_UNDER)
- `Selection` — selecciones por mercado con `oddsValue`
- `Quote` — cotización con TTL 20s, `txParams` blockchain, `expiresAt`
- `Ticket` — lifecycle completo 17 estados
- `GradingRecord` — resultado del grading, fuente ESPN API
- `SettlementJob` — job de pago con `idempotencyKey` único
- `AuditLog` — audit trail con before/after JSON

**Nuevos enums:** `EventStatus`, `MarketType`, `MarketStatus`, `QuoteStatus`, `TicketStatus` (17 estados), `GradeOutcome`, `SettlementStatus`

`npx prisma generate` — **sin errores**.

### 0.7 — libs/shared-types actualizado
`backend/libs/shared-types/index.ts` mantiene todos los tipos existentes + agrega:
- `TicketStatus` (union type, 17 estados)
- `GradeOutcome`, `SettlementStatus`
- Interfaces: `SportsbookEvent`, `Market`, `Selection`, `Quote`, `Ticket`, `GradingRecord`, `SettlementJob`

### 0.8 — .env.example
`backend/.env.example` creado con todas las variables necesarias para las 4 fases:
- `DATABASE_URL`, `DATABASE_URL_UNPOOLED`
- `REDIS_HOST`, `REDIS_PORT`
- `CHAIN_RPC_URL`, `SETTLEMENT_WALLET_PRIVATE_KEY`, `SPORTSBOOK_CONTRACT_ADDRESS`
- `QUOTE_TTL_SECONDS=20`, `EVENT_LOCK_WINDOW_MINUTES=5`, `MAX_STAKE_USD`, `MAX_PAYOUT_USD`
- `JWT_SECRET`, `JWT_EXPIRES_IN`
- Puertos por app (3000–3005)

---

## Estructura actual del monorepo (backend/)

```
backend/
├── apps/
│   ├── sportsbook-api/        ← app principal (puerto 3000)
│   │   ├── src/
│   │   │   ├── app.module.ts
│   │   │   ├── main.ts
│   │   │   ├── sports/        ← SportsService con sync ESPN (NBA, NHL, Soccer, Libertadores)
│   │   │   ├── odds/          ← OddsService vacío — implementar en Fase 1
│   │   │   ├── prisma/        ← PrismaService local (funcional)
│   │   │   └── websocket/     ← OddsGateway (MATCH_UPDATE, ODDS_UPDATE)
│   │   └── tsconfig.app.json
│   ├── odds-ingestion/        ← puerto 3001 (scaffold)
│   ├── bet-execution/         ← puerto 3002 (scaffold)
│   ├── grading/               ← puerto 3003 (scaffold)
│   ├── settlement/            ← puerto 3004 (scaffold)
│   └── admin/                 ← puerto 3005 (scaffold)
├── libs/
│   ├── shared-types/          ← @sportsbook/shared-types
│   │   ├── index.ts           ← tipos Match, Odds, TeamRanking + Ticket, Quote, etc.
│   │   └── package.json
│   └── prisma/                ← @sportsbook/prisma
│       ├── src/
│       │   ├── prisma.module.ts
│       │   ├── prisma.service.ts
│       │   └── index.ts
│       └── package.json
├── prisma/
│   └── schema.prisma          ← 3 modelos existentes + 8 nuevos (generado OK)
├── src/                       ← copia original (no eliminar, puede convivir)
├── nest-cli.json              ← multi-project, 6 apps definidas
├── tsconfig.json              ← paths: @sportsbook/shared-types, @sportsbook/prisma
├── package.json               ← deps: @sportsbook/shared-types, @sportsbook/prisma
└── .env.example
```

---

## Decisiones de diseño (ya tomadas — no debatir)

| Decisión | Valor |
|----------|-------|
| Sports v1 | Soccer/Libertadores + NBA (ya en repo) |
| Quote TTL | 20 segundos |
| Lock window antes del evento | 5 minutos |
| Política cambio de odds | Rechazar quote, retornar odds actualizadas para re-confirmación |
| Fuente verdad grading | ESPN API: `status.type.completed === true` + `status.type.state === 'post'` |
| Void rules | Evento cancelado / mercado SUSPENDED al grading / resultado contradictorio |
| Idempotency key settlement | `sha256(ticketId + outcome + amount.toString())` |
| Parlays | NO en v1 |

## Restricciones permanentes

1. `CONFIRMED` solo después de tx confirmada on-chain real
2. `idempotencyKey` en `SettlementJob` previene doble pago
3. Frontend y quote logic solo leen del modelo normalizado interno (no payloads de provider)
4. Todo override manual → entrada en `AuditLog` con actor, before, after
5. Grading/settlement solo triggereable desde servicios internos autenticados
6. Backward compatibility — frontend existente debe seguir funcionando

---

## Próximo paso: Fase 2 — Grading & Settlement

---

# Sportsbook Platform v1 — Contexto Fase 1 (Completada)

## Fecha: 2026-04-13

---

## Objetivo de Fase 1 cumplido

Quote Engine + Bet Placement + Wallet Integration. Un usuario puede:
1. Ver eventos con odds en tiempo real (vía ESPN sync → SportsbookEvent/Market/Selection)
2. Seleccionar un outcome y ver un quote con countdown (TTL 20s)
3. Conectar su wallet MetaMask (ethers v6, sin wagmi)
4. Firmar y enviar la transacción
5. Ver el ticket en estado `CONFIRMED` en su historial (confirmación real onchain o mock)

**Criterio duro cumplido:** `CONFIRMED` solo se alcanza tras receipt de tx (o mock explícito).

---

## Fase 1 — Lo que se hizo

### 1.1 — EventCatalogService
`backend/apps/sportsbook-api/src/catalog/event-catalog.service.ts`

- `syncEventFromMatch(matchId)` — llamado al final de cada evento en `syncLeague()` de SportsService. Upsert de `SportsbookEvent`, `Market` (MATCH_WINNER), y `Selection` (home/draw/away) desde los `Odds` del match. Determina `EventStatus`: `ACTIVE` si SCHEDULED y `now < lockTime`, `SUSPENDED` si LIVE o pasó lockTime, `FINISHED` si terminó.
- `suspendStaleEvents()` — cron cada 30s, suspende eventos ACTIVE cuyo `lockTime <= now`.
- `checkFeedFreshness()` — cron cada 5min, suspende eventos ACTIVE con `feedFreshAt < now - 3min`.
- Stub en `apps/odds-ingestion/src/catalog/event-catalog.service.ts` (re-export).
- `SportsModule` actualizado para importar `EventCatalogModule`.

### 1.2 — QuoteService
`backend/apps/sportsbook-api/src/quote/`

`POST /quotes` — body: `{ selectionId, stake, userId }`

7 validaciones en orden estricto:
1. Stake entre 0 y `MAX_STAKE_USD` (default 1000)
2. Selection existe en DB (con market→event→match incluidos)
3. Mercado activo (`market.status === 'ACTIVE'`)
4. Evento activo (`event.status === 'ACTIVE'`)
5. No pasó `lockTime` (auto-suspende el evento si pasó)
6. Odds no cambiaron >5% (devuelve `ODDS_CHANGED` con nuevas odds si sí)
7. Payout no supera `MAX_PAYOUT_USD` (default 10000)

Idempotencia: retorna quote `PENDING` existente si no expiró para `(userId, selectionId)`.

`txParams` incluye: `to` (treasury), `value` (stake × 1e6 en USDC units), `data` (quoteId en hex).

DTOs: `RequestQuoteDto` (class-validator), `QuoteResponseDto` (interface).

### 1.3 — Endpoints del catálogo
`backend/apps/sportsbook-api/src/events/` y `backend/apps/sportsbook-api/src/tickets/`

- `GET /events?sport=&league=&status=` — retorna `SportsbookEvent[]` con match + markets + selections
- `GET /events/:eventId` — evento completo
- `GET /tickets?userId=` — historial del usuario con quote y selection incluidos
- `GET /tickets/:ticketId` — ticket completo con gradingRecord y settlementJob
- `POST /tickets/internal/notify` — endpoint interno para que bet-execution dispare WS TICKET_UPDATE

### 1.4 — BetExecutionService
`backend/apps/bet-execution/src/` (app separada, puerto 3002)

`POST /bets/confirm` — body: `{ quoteId, txHash, userId }`

- Valida quote (existe, pertenece al userId, no expirado, sin ticket previo)
- Crea `Ticket` en estado `SUBMITTED`
- Marca quote como `ACCEPTED`
- Encola job `confirm-tx` en BullMQ queue `confirmation` (delay 3s)
- Notifica a sportsbook-api via `POST /tickets/internal/notify` (best-effort)

**ConfirmationWorker** (`apps/bet-execution/src/workers/confirmation.worker.ts`):
- Hasta 20 intentos, retry cada 6s (backoff ×2 en error de RPC)
- Si receipt OK → `CONFIRMED` + blockNumber + confirmedAt
- Si receipt.status === 0 → `REJECTED`
- Si agota intentos → `REJECTED`
- **Mock mode** (`CHAIN_RPC_URL=mock` o vacío): devuelve `{status:1, blockNumber:12345}` inmediatamente

### 1.5 — OddsGateway extendido
`broadcastTicketUpdate({ ticketId, userId, status })` → emite evento WS `TICKET_UPDATE`

### 1.6 — Frontend

**Nuevas dependencias:**
- `ethers` v6 (BrowserProvider, sin wagmi)

**Hooks nuevos:**
- `hooks/useWallet.ts` — `connect()` (eth_requestAccounts), `sendTransaction()`, `disconnect()`
- `hooks/useEvents.ts` — fetch `GET /events` con filtros opcionales
- `hooks/useTickets.ts` — fetch + polling 10s cuando hay tickets en estados transitorios

**Componentes nuevos:**
- `components/WalletButton.tsx` — muestra dirección truncada o botón "Connect Wallet"
- `components/QuoteModal.tsx` — 5 pasos:
  - Step 1: Connect Wallet
  - Step 2: Quote + countdown visual (barra + segundos) + botón "Confirm & Sign"
  - Step 3: Spinner "Waiting for wallet signature…"
  - Step 4: Spinner "Confirming on-chain…" + polling GET /tickets/:id cada 5s
  - Step 5: Confirmed (verde) / Rejected (rojo)
- `components/MyBets.tsx` — historial con 10 status badges coloreados, polling 10s en estados transitorios

**Store actualizado (`store/useStore.ts`):**
- Nuevos campos: `walletAddress`, `activeQuote`, `isQuoteModalOpen`, `userTickets`, `ticketStatusMap`
- `addBet()` ahora es single-bet: reemplaza cualquier bet anterior (v1 — no parlays)
- `Bet` interface agrega `selectionId: string` (UUID de Selection en DB)
- `selectedSection` extendido con `'mybets'`

**BetSlip actualizado:**
- Stake editable (input real, no hardcodeado)
- `handlePlaceBet()`: llama `POST /quotes`, setea `activeQuote`, abre `QuoteModal`
- Maneja `ODDS_CHANGED` mostrando mensaje inline

**MatchDetail actualizado:**
- Botones de odds clickeables (hover + active:scale-95)
- Fetch `GET /events?status=ACTIVE` al montar para obtener `selectionId` real de la Selection
- Badge "BETTING OPEN" / "Betting suspended" según `sbEvent.status`

**Layout actualizado:**
- `WalletButton` en el header
- `QuoteModal` montado globalmente
- WS `TICKET_UPDATE` escuchado aquí → llama `updateTicketStatus()`
- Botón "My Bets" en sidebar y header navega a `selectedSection = 'mybets'`

---

## Variables de entorno nuevas (backend/.env)

```
CHAIN_RPC_URL=mock                                          # vacío o 'mock' = modo dev sin blockchain
SPORTSBOOK_TREASURY_ADDRESS=0x0000000000000000000000000000000000000001
QUOTE_TTL_SECONDS=20
EVENT_LOCK_WINDOW_MINUTES=5
MAX_STAKE_USD=1000
MAX_PAYOUT_USD=10000
SPORTSBOOK_API_URL=http://127.0.0.1:3000                   # usado por bet-execution para WS notify
PORT_BET_EXECUTION=3002
```

---

## Dependencias nuevas instaladas

**backend:** `@nestjs/bullmq`, `bullmq`, `class-validator`, `class-transformer`
**frontend:** `ethers`

---

## Scripts npm nuevos (backend/package.json)

```
npm run start:bet-execution          # arrancar bet-execution (prod)
npm run start:bet-execution:dev      # arrancar bet-execution (watch)
```

---

## Arquitectura de comunicación entre servicios

```
sportsbook-api (3000)
  ├─ SportsService.syncLeague() → EventCatalogService.syncEventFromMatch()
  ├─ POST /quotes → QuoteService
  ├─ GET /events → EventsService
  ├─ GET /tickets → TicketsService
  └─ POST /tickets/internal/notify → OddsGateway.broadcastTicketUpdate()

bet-execution (3002)
  ├─ POST /bets/confirm → BetExecutionService.submitBet()
  ├─ BullMQ queue 'confirmation' → ConfirmationWorker
  └─ ConfirmationWorker → HTTP POST sportsbook-api/tickets/internal/notify (WS bridge)

Frontend (5173)
  ├─ WS socket → localhost:3000 (MATCH_UPDATE, ODDS_UPDATE, TICKET_UPDATE)
  ├─ axios → localhost:3000 (quotes, events, tickets)
  └─ axios → localhost:3002 (bets/confirm)
```

---

## Estructura de archivos nuevos creados en Fase 1

```
backend/
  apps/
    sportsbook-api/src/
      catalog/
        event-catalog.service.ts
        event-catalog.module.ts
      quote/
        quote.service.ts
        quote.controller.ts
        quote.module.ts
        dto/
          request-quote.dto.ts
      events/
        events.service.ts
        events.controller.ts
        events.module.ts
      tickets/
        tickets.service.ts
        tickets.controller.ts
        tickets.module.ts
    odds-ingestion/src/
      catalog/
        event-catalog.service.ts   ← stub/re-export
    bet-execution/src/
      execution/
        bet-execution.service.ts
        bet-execution.controller.ts
      workers/
        confirmation.worker.ts

front-sb/src/
  global.d.ts                       ← window.ethereum declaration
  hooks/
    useWallet.ts
    useEvents.ts
    useTickets.ts
  components/
    WalletButton.tsx
    QuoteModal.tsx
    MyBets.tsx
```

---

## Archivos modificados en Fase 1

```
backend/
  apps/sportsbook-api/src/
    app.module.ts              ← agrega QuoteModule, EventsModule, TicketsModule
    sports/sports.service.ts   ← inyecta EventCatalogService, llama syncEventFromMatch()
    sports/sports.module.ts    ← importa EventCatalogModule
    websocket/odds/odds.gateway.ts ← agrega broadcastTicketUpdate()
  apps/bet-execution/src/
    bet-execution.module.ts    ← BullModule, PrismaModule, BetExecutionService, ConfirmationWorker
    main.ts                    ← enableCors()
  .env                         ← agrega vars de Fase 1

front-sb/src/
  store/useStore.ts             ← nuevos campos wallet/quote, Bet agrega selectionId, single-bet
  components/BetSlip.tsx        ← stake editable, flujo quote real
  components/MatchDetail.tsx    ← odds clickeables con selectionId, fetch /events
  components/Layout.tsx         ← WalletButton, QuoteModal, WS TICKET_UPDATE, MyBets nav
```

---

## Decisiones de diseño tomadas en Fase 1

| Decisión | Valor |
|----------|-------|
| EventCatalogService location | sportsbook-api (donde vive SportsService); stub en odds-ingestion |
| WS TICKET_UPDATE bridge | bet-execution → HTTP POST /tickets/internal/notify → OddsGateway |
| Polling principal | Frontend polling GET /tickets/:id cada 5s (WS como complemento) |
| Single bet v1 | addBet() reemplaza cualquier bet anterior |
| Mock blockchain | CHAIN_RPC_URL=mock → receipt inmediato {status:1, blockNumber:12345} |
| Selection upsert | findFirst + update/create (sin @@unique en schema para evitar migración) |

---

## Próximo paso: Fase 3 — Admin Dashboard

---

# Sportsbook Platform v1 — Contexto Fase 2 (Completada)

## Fecha: 2026-04-14

---

## Objetivo de Fase 2 cumplido

Grading Engine + Settlement App + Retries + Reconciliación. El sistema puede:
1. Detectar automáticamente cuando un partido termina (ESPN `completed: true`)
2. Clasificar cada ticket CONFIRMED como WON, LOST, VOID o REFUND
3. Enviar el payout directamente a la wallet del usuario ganador
4. Reintentar automáticamente los pagos fallidos hasta el umbral configurado
5. Mover a MANUAL_REVIEW / MANUAL_INTERVENTION los casos irresolubles
6. Emitir updates de estado al frontend en tiempo real

**Criterio duro cumplido:** Ningún ticket puede recibir dos pagos. `idempotencyKey` en `SettlementJob` es la última línea de defensa — verificada antes de cualquier tx.

---

## Fase 2 — Lo que se hizo

### 2.1 — GradingService (`apps/grading`, puerto 3003)

**ResultWatcherService** (`apps/grading/src/result/result-watcher.service.ts`):
- `onModuleInit()` — procesa tickets CONFIRMED de partidos ya FINISHED al arrancar (recovery ante reinicios)
- Cron `*/30 * * * * *` — busca `SportsbookEvent` con status FINISHED que tengan tickets CONFIRMED sin `GradingRecord`
- Encola jobs `grade-event` en BullMQ con `jobId: grade-${eventId}` (previene duplicados en queue)

**GradingWorker** (`apps/grading/src/grading/grading.worker.ts`):
- `@Processor('grading')` extiende `WorkerHost`
- Procesa jobs `grade-event` → delega a `GradingService.gradeEvent()`

**GradingService** (`apps/grading/src/grading/grading.service.ts`):
- `gradeEvent(eventId)` — carga evento con todo el árbol market→selection→quote→ticket, llama `fetchOfficialResult`, itera tickets sin GradingRecord
- `determineOutcome()` — prioridad VOID > MANUAL_REVIEW > MATCH_WINNER > OVER_UNDER
- `gradeMatchWinner()` — usa campo `winner` de ESPN si disponible; fallback a scores
- `gradeOverUnder()` — push exacto (total === line) → REFUND
- `outcomeToTicketStatus()` — WIN→WON, LOSS→LOST, VOID→VOID, REFUND→REFUNDED, MANUAL_REVIEW→MANUAL_REVIEW
- `fetchOfficialResult()` — llama ESPN scoreboard con fecha del partido, verifica `status.type.completed === true` y `state === 'post'`
- `buildEspnPath()` — mapea league DB a path ESPN (NBA, NHL, SOCCER, LIBERTADORES)
- `createSettlementJob()` — solo si WIN o REFUND; genera `idempotencyKey = sha256(ticketId:outcome:amount.toFixed(6))`; doble check de existencia antes de crear; actualiza ticket a SETTLING
- Idempotencia de grading: captura error Prisma `P2002` (unique constraint en `GradingRecord.ticketId`) → trata como "ya gradado"
- `broadcastTicketUpdate()` → HTTP POST `sportsbook-api/internal/broadcast-ticket` (best-effort)

**GradingModule** (`apps/grading/src/grading.module.ts`):
- Imports: PrismaModule, BullModule.forRoot + registerQueue('grading'), HttpModule, ScheduleModule.forRoot()
- Providers: GradingService, GradingWorker, ResultWatcherService

### 2.2 — SettlementService (`apps/settlement`, puerto 3004)

**SettlementWatcherService** (`apps/settlement/src/settlement/settlement-watcher.service.ts`):
- Cron `*/15 * * * * *` — busca `SettlementJob` con status PENDING o FAILED con `attempts < MAX_ATTEMPTS`
- Lotes de 50, orden FIFO (`orderBy: createdAt asc`)
- Encola jobs `execute-settlement` con `jobId: settle-${job.id}`

**SettlementWorker** (`apps/settlement/src/settlement/settlement.worker.ts`):
- `@Processor('settlement')` extiende `WorkerHost`
- Procesa `execute-settlement` → `SettlementService.executeSettlement()`
- Procesa `verify-settlement-tx` → `SettlementService.verifySettlementTx()`

**SettlementService** (`apps/settlement/src/settlement/settlement.service.ts`):
- `executeSettlement(settlementJobId)`:
  1. Guard: skip si ya CONFIRMED o MANUAL_INTERVENTION
  2. Guard: si `attempts >= MAX_ATTEMPTS` → MANUAL_INTERVENTION + ticket SETTLEMENT_FAILED
  3. Doble verificación idempotency: busca otro job CONFIRMED con mismo `idempotencyKey` → previene pago duplicado silenciosamente
  4. Escribe `status: SUBMITTED` en DB **antes** de enviar tx (safe crash recovery)
  5. `sendPayoutTransaction()` → mock o ethers.js real
  6. Guarda `txHash`, encola `verify-settlement-tx` con delay 5000ms
  7. Si falla tx → `status: FAILED` (reintentable)
- `verifySettlementTx()`: polling hasta 20 intentos cada 6s; `receipt.status === 0` → FAILED; `status === 1` → CONFIRMED + ticket SETTLED
- `sendPayoutTransaction()`: mock mode devuelve `0x${idempotencyKey.slice(0,62)}`; prod usa `ethers.Wallet.sendTransaction()`
- `getTransactionReceipt()`: mock devuelve `{status: 1, blockNumber: 99999}` inmediatamente

**SettlementModule** (`apps/settlement/src/settlement.module.ts`):
- Imports: PrismaModule, BullModule (queue 'settlement'), HttpModule, ScheduleModule.forRoot()

### 2.3 — Endpoint interno de broadcast (`apps/sportsbook-api`)

**InternalController** (`apps/sportsbook-api/src/internal/internal.controller.ts`):
- `POST /internal/broadcast-ticket` — recibe `{ ticketId, userId, status }`, llama `OddsGateway.broadcastTicketUpdate()`
- Protegido con `LocalhostGuard`

**LocalhostGuard** (`apps/sportsbook-api/src/internal/localhost.guard.ts`):
- Rechaza requests cuya IP no sea `127.0.0.1`, `::1`, o `::ffff:127.0.0.1`

`AppModule` actualizado para incluir `InternalController` en `controllers[]`.

### 2.4 — Schema Prisma

Campo `notes String?` agregado a `SettlementJob` para guardar razón de duplicados prevenidos.
`npx prisma db push` aplicado (DB en sync).

### 2.5 — Frontend

**MyBets.tsx** extendido:
- Badge `SETTLING` → spinner naranja + "Paying out..."
- Badge `SETTLED` → verde brillante + monto recibido
- Badge `WON` → verde esmeralda
- Badge `SETTLEMENT_FAILED` → naranja + "Payment issue — contact support"
- Para tickets SETTLED: muestra monto recibido (`settlementJob.amount`) y link a Etherscan con `txHash`
- `GET /tickets?userId=` ahora incluye `settlementJob` (actualizado en `TicketsService.findByUser`)

**Layout.tsx** actualizado:
- Toast verde "Payout sent to your wallet!" al recibir WS `TICKET_UPDATE` con status `SETTLED`
- Toast verde "You won! Payout processing…" al recibir status `WON`
- Toast auto-desaparece a los 4 segundos

**useTickets.ts** actualizado:
- `TRANSITIONAL_STATUSES` ahora incluye `CONFIRMED` y `WON` además de `SUBMITTED`, `CONFIRMING`, `SETTLING`
- Garantiza polling continuo durante toda la cadena grading→settlement

---

## Variables de entorno nuevas (backend/.env)

```
MAX_SETTLEMENT_ATTEMPTS=5
SETTLEMENT_WALLET_PRIVATE_KEY=0x...    # wallet del operador para pagar winners
GRADING_POLL_INTERVAL_SECONDS=30
PORT_GRADING=3003
PORT_SETTLEMENT=3004
```

---

## Dependencias nuevas instaladas

**backend:** `@nestjs/axios`, `ethers`

---

## Scripts npm nuevos (backend/package.json)

```
npm run start:grading           # arrancar grading (prod)
npm run start:grading:dev       # arrancar grading (watch)
npm run start:settlement        # arrancar settlement (prod)
npm run start:settlement:dev    # arrancar settlement (watch)
```

---

## Arquitectura de comunicación entre servicios (actualizada)

```
sportsbook-api (3000)
  ├─ SportsService.syncLeague() → EventCatalogService.syncEventFromMatch()
  ├─ POST /quotes → QuoteService
  ├─ GET /events → EventsService
  ├─ GET /tickets → TicketsService (incluye settlementJob)
  ├─ POST /tickets/internal/notify → OddsGateway.broadcastTicketUpdate()
  └─ POST /internal/broadcast-ticket → OddsGateway.broadcastTicketUpdate() [LocalhostGuard]

bet-execution (3002)
  ├─ POST /bets/confirm → BetExecutionService.submitBet()
  ├─ BullMQ queue 'confirmation' → ConfirmationWorker
  └─ ConfirmationWorker → HTTP POST sportsbook-api/tickets/internal/notify

grading (3003)
  ├─ Cron 30s → ResultWatcherService → BullMQ queue 'grading'
  ├─ GradingWorker → GradingService.gradeEvent()
  └─ GradingService → HTTP POST sportsbook-api/internal/broadcast-ticket

settlement (3004)
  ├─ Cron 15s → SettlementWatcherService → BullMQ queue 'settlement'
  ├─ SettlementWorker → SettlementService.executeSettlement()
  ├─ SettlementService → sendPayoutTransaction() [mock o ethers.js]
  └─ SettlementService → HTTP POST sportsbook-api/internal/broadcast-ticket

Frontend (5173)
  ├─ WS socket → localhost:3000 (MATCH_UPDATE, ODDS_UPDATE, TICKET_UPDATE)
  ├─ axios → localhost:3000 (quotes, events, tickets)
  └─ axios → localhost:3002 (bets/confirm)
```

---

## Flujo end-to-end completo (con mock)

```
POST /bets/confirm
  → Ticket: SUBMITTED → CONFIRMING → CONFIRMED

Cron grading (30s)
  → detecta Ticket CONFIRMED sin GradingRecord + Match FINISHED
  → GradingService.gradeEvent()
  → GradingRecord creado (inmutable)
  → Ticket: WON / LOST / VOID / REFUNDED / MANUAL_REVIEW
  → si WON o REFUND → SettlementJob creado (PENDING) + Ticket: SETTLING

Cron settlement (15s)
  → detecta SettlementJob PENDING
  → SettlementService.executeSettlement()
  → SettlementJob: SUBMITTED (escrito ANTES de enviar tx)
  → sendPayoutTransaction() → fakeTxHash (mock)
  → verify-settlement-tx (delay 5s)
  → receipt {status:1} → SettlementJob: CONFIRMED + Ticket: SETTLED

Ciclo total en mock: ~1 minuto
```

---

## Estructura de archivos nuevos creados en Fase 2

```
backend/
  apps/
    grading/src/
      grading.module.ts           ← reemplaza scaffold vacío
      main.ts                     ← enableCors() + PORT_GRADING
      grading/
        grading.service.ts
        grading.worker.ts
      result/
        result-watcher.service.ts
    settlement/src/
      settlement.module.ts        ← reemplaza scaffold vacío
      main.ts
      settlement/
        settlement.service.ts
        settlement.worker.ts
        settlement-watcher.service.ts
    sportsbook-api/src/
      internal/
        internal.controller.ts
        localhost.guard.ts

front-sb/src/
  components/
    MyBets.tsx                    ← extendido con settlement states
    Layout.tsx                    ← extendido con toast notifications
```

---

## Archivos modificados en Fase 2

```
backend/
  apps/sportsbook-api/src/
    app.module.ts                 ← agrega InternalController
    tickets/tickets.service.ts    ← findByUser incluye settlementJob
  prisma/schema.prisma            ← notes String? en SettlementJob
  package.json                    ← scripts grading/settlement, deps axios/ethers
  .env.example                    ← vars Fase 2

front-sb/src/
  hooks/useTickets.ts             ← CONFIRMED y WON en TRANSITIONAL_STATUSES
  components/MyBets.tsx           ← settlement badges, payout amount, txHash link
  components/Layout.tsx           ← toast SETTLED/WON
```

---

## Decisiones de diseño tomadas en Fase 2

| Decisión | Valor |
|----------|-------|
| Idempotencia grading | GradingRecord @unique ticketId — capturar P2002 como "ya gradado" |
| Idempotencia settlement | idempotencyKey = sha256(ticketId:outcome:amount.toFixed(6)) |
| Orden operaciones settlement | SUBMITTED escrito en DB ANTES de enviar tx (safe crash recovery) |
| Mock settlement | CHAIN_RPC_URL=mock → fakeTxHash + receipt {status:1} inmediato |
| WS bridge grading/settlement | HTTP POST interno a sportsbook-api /internal/broadcast-ticket |
| Seguridad endpoint interno | LocalhostGuard — rechaza IPs que no sean 127.0.0.1 |
| BullMQ jobId | grade-\${eventId} y settle-\${jobId} — BullMQ rechaza duplicados silenciosamente |
| Reintentos settlement | MAX_ATTEMPTS=5; después → MANUAL_INTERVENTION + ticket SETTLEMENT_FAILED |
| GradingRecord inmutabilidad | Nunca se modifica — errores de grading se corrigen en Fase 3 (Admin) |

---

## Próximo paso: Fase 4 — Expansión post-launch (Out of scope v1)

---

# Sportsbook Platform v1 — Contexto Fase 3 (Completada)

## Fecha: 2026-04-14

---

## Objetivo de Fase 3 cumplido

Admin Dashboard + Hardening Operacional. Un operador autenticado puede:
1. Ver en tiempo real el estado de feed, eventos y mercados
2. Suspender / reactivar eventos y mercados manualmente
3. Ver todos los tickets agrupados por estado con búsqueda
4. Revisar y resolver casos de MANUAL_REVIEW (tickets sin grading automático)
5. Ver y reintentar SettlementJob en MANUAL_INTERVENTION
6. Ver un audit trail completo de todas las acciones del operador
7. Recibir alertas cuando el feed está stale o hay backlogs crecientes

**Criterio duro cumplido:** Todo override manual genera entrada en AuditLog con actor, timestamp, before y after.

---

## Fase 3 — Lo que se hizo

### 3.1 — Auth en apps/admin

**AuthModule** (`apps/admin/src/auth/`):
- JWT auth con `@nestjs/jwt` + `@nestjs/passport` + `passport-jwt`
- `POST /auth/login` — credenciales hardcodeadas desde env (v1), retorna JWT con expiresAt
- `JwtAuthGuard` como APP_GUARD global — todos los endpoints protegidos
- `@Public()` decorator para excluir `/auth/login` y `/health`
- `JwtStrategy` valida tokens con JWT_SECRET

### 3.2 — Endpoints del Admin API

**Feed** (`apps/admin/src/feed/`):
- `GET /admin/feed/health` — estado FRESH/STALE/DEAD por liga con ageSeconds

**Events** (`apps/admin/src/events/`):
- `GET /admin/events` — listado paginado con filtros status/league
- `PATCH /admin/events/:eventId/suspend` — suspende evento + mercados activos + AuditLog
- `PATCH /admin/events/:eventId/reactivate` — solo si lockTime > now() + AuditLog
- `PATCH /admin/markets/:marketId/suspend` + `/reactivate` + AuditLog

**Tickets** (`apps/admin/src/tickets/`):
- `GET /admin/tickets` — filtros status/userId/league/dateFrom/dateTo, paginado
- `GET /admin/tickets/:ticketId` — detalle completo con quote, selection, match, grading, settlement
- `PATCH /admin/tickets/:ticketId/grade` — override manual para MANUAL_REVIEW (WIN/LOSS/VOID/REFUND)
- `PATCH /admin/tickets/:ticketId/void` — fuerza VOID en ticket CONFIRMED sin gradingRecord

**Settlements** (`apps/admin/src/settlements/`):
- `GET /admin/settlements` — filtro por status, paginado
- `GET /admin/settlements/stats` — conteos + totalPaidTodayUsd
- `POST /admin/settlements/:id/retry` — reset a PENDING con attempts=0 + AuditLog

**Stats** (`apps/admin/src/stats/`):
- `GET /admin/stats` — snapshot operacional completo (tickets, settlements, feed, events)

**Audit** (`apps/admin/src/audit/`):
- `GET /admin/audit` — filtros entity/entityId/actor/dateFrom/dateTo, paginado

### 3.3 — AuditService

`apps/admin/src/audit/audit.service.ts` — servicio global, inyectado en todos los services que modifican estado. Crea AuditLog con entity, entityId, action, actor, before, after, reason.

### 3.4 — Manual Grading con audit

AdminTicketsService.manualGrade():
1. Verifica ticket en MANUAL_REVIEW
2. Crea GradingRecord con gradedBy=actor, resultSource=MANUAL_OPERATOR
3. Actualiza ticket status
4. Crea AuditLog
5. Si WIN/REFUND → crea SettlementJob con idempotencyKey + ticket a SETTLING

### 3.5 — Settlement retry con audit

AdminSettlementsService.retrySettlement():
- Reset status a PENDING, attempts a 0
- Restaura ticket a SETTLING
- AuditLog con before/after

### 3.6 — Frontend Admin (front-admin/)

**Stack:** Vite 8 + React 19 + TypeScript + Tailwind CSS v4 + Zustand + Axios + socket.io-client + lucide-react

**Estructura:**
- `src/api/auth.api.ts` — login
- `src/api/admin.api.ts` — funciones tipadas para todos los endpoints, interceptor 401→redirect login
- `src/store/useAdminStore.ts` — token, stats, alertas, WS counters
- `src/components/` — Sidebar, TopBar, AlertBanner, StatusBadge, ConfirmModal
- `src/pages/` — LoginPage, DashboardPage, FeedHealthPage, EventsPage, TicketsPage, ManualReviewPage, SettlementPage, AuditPage

**Páginas:**
- LoginPage — formulario username/password, JWT en localStorage
- DashboardPage — 4 metric cards + AlertBanner + event/settlement stats, polling 30s
- FeedHealthPage — tabla por liga con FRESH/STALE/DEAD badges
- EventsPage — tabla filtrable, suspend/reactivate con modal+reason
- TicketsPage — tabla filtrable + panel lateral detalle
- ManualReviewPage — cards con ESPN resultRaw, botones WIN/LOSS/VOID/REFUND, reason obligatoria, modal confirmación
- SettlementPage — tabla con retry para FAILED/MANUAL_INTERVENTION
- AuditPage — tabla cronológica expandible con JSON before/after

### 3.7 — Alertas y observabilidad

**AlertService** (`apps/admin/src/alerts/`):
- Cron cada 2 min: checkFeedStaleness, checkManualReviewBacklog, checkSettlementBacklog
- Logger.warn para cada condición de alerta

**WebSocket en admin frontend:**
- Conecta al WS de sportsbook-api (:3000)
- Escucha TICKET_UPDATE → incrementa badges en sidebar

### 3.8 — Hardening

**Rate limiting en sportsbook-api:**
- `@nestjs/throttler` con ThrottlerGuard global
- `POST /quotes`: 10 req/min por IP
- General: 100 req/min

**LockTime buffer:**
- QuoteService: 2 segundos de buffer antes del lockTime

**Prisma indexes:**
- Ticket: @@index([status]), @@index([userId]), @@index([createdAt])
- SettlementJob: @@index([status]), @@index([createdAt])
- AuditLog: @@index([createdAt]), @@index([actor])

**Health checks:**
- `GET /health` en las 6 apps: `{ status: 'ok', app: string, uptime: number }`

---

## Variables de entorno nuevas (backend/.env)

```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme_in_production
JWT_SECRET=your-long-random-secret-here
JWT_EXPIRES_IN=8h
ADMIN_FRONTEND_URL=http://localhost:5174
FEED_STALE_THRESHOLD_SECONDS=180
MANUAL_REVIEW_ALERT_THRESHOLD=1
SETTLEMENT_ALERT_THRESHOLD=1
```

## Variables de entorno (front-admin/.env)

```
VITE_ADMIN_API_URL=http://localhost:3005
VITE_SPORTSBOOK_WS_URL=http://localhost:3000
```

---

## Dependencias nuevas instaladas

**backend:** `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `@nestjs/throttler`, `@types/passport-jwt` (dev)
**front-admin:** `axios`, `zustand`, `@tailwindcss/vite`, `lucide-react`, `socket.io-client`

---

## Scripts npm nuevos (backend/package.json)

```
npm run start:admin           # arrancar admin (prod)
npm run start:admin:dev       # arrancar admin (watch)
```

---

## Arquitectura de comunicación (actualizada)

```
sportsbook-api (3000)
  ├─ SportsService.syncLeague() → EventCatalogService.syncEventFromMatch()
  ├─ POST /quotes → QuoteService (rate limited: 10/min)
  ├─ GET /events → EventsService
  ├─ GET /tickets → TicketsService
  ├─ POST /internal/broadcast-ticket → OddsGateway.broadcastTicketUpdate()
  ├─ WebSocket → MATCH_UPDATE, ODDS_UPDATE, TICKET_UPDATE
  └─ GET /health

admin (3005)
  ├─ POST /auth/login → JWT (no auth)
  ├─ GET /admin/feed/health
  ├─ GET/PATCH /admin/events → suspend/reactivate + AuditLog
  ├─ GET/PATCH /admin/tickets → list, detail, manual grade, void + AuditLog
  ├─ GET/POST /admin/settlements → list, stats, retry + AuditLog
  ├─ GET /admin/stats → snapshot operacional
  ├─ GET /admin/audit → audit trail
  ├─ Cron 2min → AlertService
  └─ GET /health

front-admin (5174)
  ├─ axios → localhost:3005 (admin API)
  ├─ WS → localhost:3000 (TICKET_UPDATE)
  └─ Polling 30s → /admin/stats
```

---

## Estructura de archivos nuevos creados en Fase 3

```
backend/
  apps/admin/src/
    admin.module.ts          ← reemplaza scaffold vacío
    main.ts                  ← CORS + port 3005
    health.controller.ts
    auth/
      auth.module.ts
      auth.service.ts
      auth.controller.ts
      jwt.strategy.ts
      jwt-auth.guard.ts
      public.decorator.ts
    audit/
      audit.module.ts
      audit.service.ts
      audit.controller.ts
    alerts/
      alerts.module.ts
      alert.service.ts
    feed/
      feed.module.ts
      feed.service.ts
      feed.controller.ts
    events/
      events.module.ts
      events.service.ts
      events.controller.ts
    tickets/
      tickets.module.ts
      tickets.service.ts
      tickets.controller.ts
    settlements/
      settlements.module.ts
      settlements.service.ts
      settlements.controller.ts
    stats/
      stats.module.ts
      stats.service.ts
      stats.controller.ts
  apps/bet-execution/src/health.controller.ts
  apps/grading/src/health.controller.ts
  apps/settlement/src/health.controller.ts
  apps/odds-ingestion/src/health.controller.ts

front-admin/
  .env
  vite.config.ts
  index.html
  src/
    index.css
    main.tsx
    App.tsx
    api/
      auth.api.ts
      admin.api.ts
    store/
      useAdminStore.ts
    components/
      Sidebar.tsx
      TopBar.tsx
      AlertBanner.tsx
      StatusBadge.tsx
      ConfirmModal.tsx
    pages/
      LoginPage.tsx
      DashboardPage.tsx
      FeedHealthPage.tsx
      EventsPage.tsx
      TicketsPage.tsx
      ManualReviewPage.tsx
      SettlementPage.tsx
      AuditPage.tsx
```

---

## Archivos modificados en Fase 3

```
backend/
  prisma/schema.prisma            ← indexes en Ticket, SettlementJob, AuditLog
  package.json                    ← scripts admin, deps jwt/passport/throttler
  .env.example                    ← vars Fase 3
  apps/sportsbook-api/src/
    app.module.ts                 ← ThrottlerModule + ThrottlerGuard global
    app.controller.ts             ← GET /health
    quote/quote.controller.ts     ← @Throttle en POST /quotes
    quote/quote.service.ts        ← lockTime buffer 2s
  apps/bet-execution/src/
    bet-execution.module.ts       ← HealthController
  apps/grading/src/
    grading.module.ts             ← HealthController
  apps/settlement/src/
    settlement.module.ts          ← HealthController
  apps/odds-ingestion/src/
    odds-ingestion.module.ts      ← HealthController
```
