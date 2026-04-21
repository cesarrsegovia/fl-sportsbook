# Setup — Variables de Entorno

Crea el archivo `backend/.env` con el siguiente contenido. Los valores de base de datos ya están configurados para el entorno de desarrollo en Neon.

```env
# ── Base de datos (Neon PostgreSQL) ──────────────────────────────────────────
DATABASE_URL="postgresql://neondb_owner:npg_vBKAM1Ymuo0w@ep-green-sea-anirse2u-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
DATABASE_URL_UNPOOLED="postgresql://neondb_owner:npg_vBKAM1Ymuo0w@ep-green-sea-anirse2u.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# ── Redis ─────────────────────────────────────────────────────────────────────
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# ── Blockchain ────────────────────────────────────────────────────────────────
# "mock" deshabilita transacciones reales; reemplazar con URL de Infura/Alchemy en prod
CHAIN_RPC_URL=mock
SPORTSBOOK_TREASURY_ADDRESS=0x0000000000000000000000000000000000000001
SETTLEMENT_WALLET_PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000001

# ── Configuración de quotes ───────────────────────────────────────────────────
QUOTE_TTL_SECONDS=20
EVENT_LOCK_WINDOW_MINUTES=5
MAX_STAKE_USD=1000
MAX_PAYOUT_USD=10000

# ── Parlays (Fase 4) ──────────────────────────────────────────────────────────
MAX_PARLAY_STAKE_USD=200
MAX_PARLAY_PAYOUT_USD=50000

# ── Cashout (Fase 4) ──────────────────────────────────────────────────────────
CASHOUT_MARGIN=0.05

# ── Promotions (Fase 4) ───────────────────────────────────────────────────────
PROMOTIONS_ENABLED=true

# ── Settlement (Fase 2) ───────────────────────────────────────────────────────
MAX_SETTLEMENT_ATTEMPTS=5

# ── Grading (Fase 2) ──────────────────────────────────────────────────────────
GRADING_POLL_INTERVAL_SECONDS=30

# ── Admin Auth (Fase 3) ───────────────────────────────────────────────────────
JWT_SECRET=dev-secret-change-me-in-production-please-use-long-random-string
JWT_EXPIRES_IN=8h
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme
ADMIN_FRONTEND_URL=http://localhost:5174

# ── Alertas (Fase 3) ──────────────────────────────────────────────────────────
FEED_STALE_THRESHOLD_SECONDS=180
MANUAL_REVIEW_ALERT_THRESHOLD=1
SETTLEMENT_ALERT_THRESHOLD=1

# ── URLs internas ─────────────────────────────────────────────────────────────
SPORTSBOOK_API_URL=http://127.0.0.1:3000

# ── Puertos ───────────────────────────────────────────────────────────────────
PORT_SPORTSBOOK_API=3000
PORT_ODDS_INGESTION=3001
PORT_BET_EXECUTION=3002
PORT_GRADING=3003
PORT_SETTLEMENT=3004
PORT_ADMIN=3005
```

> **Nota:** `CHAIN_RPC_URL=mock` activa el modo mock para blockchain, lo que permite desarrollar y testear sin necesidad de una red real ni fondos. Cambiar a una URL de Infura/Alchemy solo para testing en testnet o producción.
