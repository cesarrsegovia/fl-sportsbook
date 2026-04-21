/**
 * @module shared-types
 * @description Tipos compartidos entre todos los microservicios del sportsbook.
 * Centraliza las interfaces de dominio para partidos, cuotas, rankings,
 * WebSocket, tickets, mercados, selecciones, calificaciones y liquidaciones.
 */

// ─── Tipos del Dashboard Deportivo ────────────────────────────────────────────

/**
 * Ranking de un equipo dentro de una liga.
 *
 * @interface TeamRanking
 */
export interface TeamRanking {
  /** Identificador único del ranking */
  id: string;
  /** Liga a la que pertenece (ej. NBA, SOCCER) */
  league: string;
  /** Conferencia o grupo dentro de la liga */
  conference: string;
  /** Nombre completo del equipo */
  teamName: string;
  /** Abreviatura del equipo (ej. LAL, BOS) */
  teamAbbr: string;
  /** URL del logo del equipo */
  teamLogo?: string | null;
  /** Cantidad de victorias */
  wins: number;
  /** Cantidad de derrotas */
  losses: number;
  /** Juegos detrás del líder */
  gamesBehind: number;
  /** Racha actual (ej. "W3", "L2") */
  streak: string | null;
  /** Posición/seed en la clasificación */
  seed: number;
  /** Porcentaje de victorias o puntos acumulados */
  pct: number;
}

/**
 * Marcador de un período individual dentro de un partido.
 *
 * @interface PeriodScore
 */
export interface PeriodScore {
  /** Número del período (1-indexed) */
  period: number;
  /** Puntos anotados en ese período */
  value: number;
}

/**
 * Representación de un partido deportivo.
 * Contiene información de ambos equipos, marcadores, estado y estadísticas detalladas.
 *
 * @interface Match
 */
export interface Match {
  /** Identificador único del partido */
  id: string;
  /** Nombre del equipo local */
  homeTeam: string;
  /** Nombre del equipo visitante */
  awayTeam: string;
  /** URL del logo del equipo local */
  homeLogo?: string | null;
  /** URL del logo del equipo visitante */
  awayLogo?: string | null;
  /** Marcador actual del equipo local */
  homeScore: number;
  /** Marcador actual del equipo visitante */
  awayScore: number;
  /** Estado del partido (ej. SCHEDULED, LIVE, FINISHED) */
  status: string;
  /** Reloj actual del partido o indicador (ej. "Q2 5:30", "FINAL") */
  currentClock: string | null;
  /** Hora de inicio programada del partido */
  startTime?: string | Date;
  /** Liga a la que pertenece el partido */
  league?: string;
  /** Marcadores parciales por período del equipo local */
  homeLinescores?: PeriodScore[];
  /** Marcadores parciales por período del equipo visitante */
  awayLinescores?: PeriodScore[];
  /** Líderes estadísticos del partido (puntos, rebotes, etc.) */
  leaders?: {
    /** Nombre de la categoría estadística */
    name: string;
    /** Valor de la estadística */
    value: string;
    /** Información del atleta líder */
    athlete: {
      /** Nombre del atleta */
      displayName: string;
      /** URL de la foto del atleta */
      headshot?: string;
      /** Posición del atleta */
      position?: string;
    };
  }[];
}

/**
 * Cuotas de apuestas para un partido específico.
 *
 * @interface Odds
 */
export interface Odds {
  /** ID del partido asociado */
  matchId: string;
  /** Proveedor de las cuotas (ej. ESPN BET) */
  provider?: string | null;
  /** Cuota para victoria del equipo local (línea de dinero) */
  homeWin: number | null;
  /** Cuota para victoria del equipo visitante (línea de dinero) */
  awayWin: number | null;
  /** Cuota para empate (solo disponible en deportes con empate) */
  draw?: number | null;
}

/**
 * Actualización parcial de un partido. Extiende Match con campos opcionales
 * para transmitir solo los cambios vía WebSocket.
 *
 * @interface MatchUpdate
 */
export interface MatchUpdate extends Partial<Match> {
  /** Identificador único del partido (requerido) */
  id: string;
}

/**
 * Mensaje transmitido a través de WebSocket a los clientes conectados.
 *
 * @interface WebSocketMessage
 */
export interface WebSocketMessage {
  /** Tipo de evento WebSocket */
  type: 'MATCH_UPDATE' | 'ODDS_UPDATE' | 'STANDINGS_UPDATE';
  /** Datos del evento (varía según el tipo) */
  data: any;
}

// ─── Tipos del Sportsbook (Fases 1–3) ────────────────────────────────────────

/**
 * Estados posibles de un ticket de apuesta a lo largo de su ciclo de vida.
 * Flujo típico: DRAFT → QUOTE_PENDING → SUBMITTED → CONFIRMED → WON/LOST → SETTLING → SETTLED
 */
export type TicketStatus =
  | 'DRAFT'
  | 'QUOTE_PENDING'
  | 'QUOTE_ISSUED'
  | 'AWAITING_SIGNATURE'
  | 'SUBMITTED'
  | 'CONFIRMING'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'LOST'
  | 'WON'
  | 'VOID'
  | 'REFUNDED'
  | 'SETTLING'
  | 'SETTLED'
  | 'SETTLEMENT_FAILED'
  | 'MANUAL_REVIEW';

/**
 * Resultado de la calificación de un ticket.
 * Determina si el usuario ganó, perdió, o se requiere intervención manual.
 */
export type GradeOutcome = 'WIN' | 'LOSS' | 'VOID' | 'REFUND' | 'MANUAL_REVIEW';

/**
 * Estados posibles de un trabajo de liquidación (pago al usuario).
 */
export type SettlementStatus =
  | 'PENDING'
  | 'SUBMITTED'
  | 'CONFIRMED'
  | 'FAILED'
  | 'MANUAL_INTERVENTION';

/**
 * Evento del sportsbook que envuelve un partido deportivo para el sistema de apuestas.
 * Controla el estado del evento y el momento de cierre para nuevas apuestas.
 *
 * @interface SportsbookEvent
 */
export interface SportsbookEvent {
  /** Identificador único del evento */
  id: string;
  /** ID del partido deportivo asociado */
  matchId: string;
  /** Estado actual del evento de apuestas */
  status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED' | 'FINISHED';
  /** Momento a partir del cual no se aceptan más apuestas */
  lockTime: string | Date;
  /** Última vez que se actualizó el feed de datos para este evento */
  feedFreshAt?: string | Date | null;
}

/**
 * Mercado de apuestas dentro de un evento. Cada evento puede tener múltiples mercados
 * (ej. ganador del partido, más/menos goles, doble chance).
 *
 * @interface Market
 */
export interface Market {
  /** Identificador único del mercado */
  id: string;
  /** ID del evento al que pertenece */
  eventId: string;
  /** Tipo de mercado de apuestas */
  type: 'MATCH_WINNER' | 'OVER_UNDER';
  /** Estado actual del mercado */
  status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
  /** Selecciones disponibles dentro de este mercado */
  selections?: Selection[];
}

/**
 * Selección individual dentro de un mercado (ej. "home", "away", "draw").
 * Representa una opción sobre la cual el usuario puede apostar.
 *
 * @interface Selection
 */
export interface Selection {
  /** Identificador único de la selección */
  id: string;
  /** ID del mercado al que pertenece */
  marketId: string;
  /** Nombre de la selección (ej. "home", "away", "draw", "over", "under") */
  name: string;
  /** Valor de las cuotas para esta selección */
  oddsValue: number;
}

/**
 * Cotización generada para una apuesta. Tiene un TTL (tiempo de vida) limitado
 * y contiene los parámetros necesarios para ejecutar la transacción on-chain.
 *
 * @interface Quote
 */
export interface Quote {
  /** Identificador único de la cotización */
  id: string;
  /** ID de la selección elegida */
  selectionId: string;
  /** ID del usuario solicitante */
  userId: string;
  /** Monto apostado (en USD) */
  stake: number;
  /** Cuotas vigentes al momento de la cotización */
  oddsAtQuote: number;
  /** Pago esperado si la apuesta resulta ganadora */
  expectedPayout: number;
  /** Estado actual de la cotización */
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REJECTED';
  /** Parámetros de la transacción blockchain */
  txParams?: Record<string, unknown> | null;
  /** Fecha y hora de expiración de la cotización */
  expiresAt: string | Date;
  /** Fecha y hora de creación de la cotización */
  createdAt: string | Date;
}

/**
 * Ticket de apuesta confirmado. Representa una apuesta activa en el sistema
 * vinculada a una transacción on-chain.
 *
 * @interface Ticket
 */
export interface Ticket {
  /** Identificador único del ticket */
  id: string;
  /** ID de la cotización asociada */
  quoteId: string;
  /** ID del usuario propietario */
  userId: string;
  /** Hash de la transacción blockchain */
  txHash?: string | null;
  /** Número de bloque donde se confirmó la transacción */
  blockNumber?: number | null;
  /** Fecha y hora de confirmación on-chain */
  confirmedAt?: string | Date | null;
  /** Estado actual del ticket */
  status: TicketStatus;
  /** Fecha de creación del ticket */
  createdAt: string | Date;
  /** Fecha de última actualización */
  updatedAt: string | Date;
}

/**
 * Registro de calificación de un ticket. Documenta el resultado oficial
 * y la fuente de datos utilizada para determinar el resultado.
 *
 * @interface GradingRecord
 */
export interface GradingRecord {
  /** Identificador único del registro */
  id: string;
  /** ID del ticket calificado */
  ticketId: string;
  /** Resultado de la calificación */
  outcome: GradeOutcome;
  /** Fuente del resultado (ej. ESPN_API, MANUAL_OPERATOR) */
  resultSource: string;
  /** Fecha y hora de la calificación */
  gradedAt: string | Date;
  /** Entidad que realizó la calificación (system, operator) */
  gradedBy: string;
  /** Notas adicionales sobre la calificación */
  notes?: string | null;
}

/**
 * Trabajo de liquidación que representa un pago pendiente al usuario.
 * Utiliza una clave de idempotencia para prevenir pagos duplicados.
 *
 * @interface SettlementJob
 */
export interface SettlementJob {
  /** Identificador único del trabajo */
  id: string;
  /** ID del ticket a liquidar */
  ticketId: string;
  /** Clave SHA-256 para garantizar idempotencia del pago */
  idempotencyKey: string;
  /** Monto a pagar (en USD) */
  amount: number;
  /** Dirección de wallet destino del usuario */
  toWallet: string;
  /** Hash de la transacción de pago */
  txHash?: string | null;
  /** Estado actual del trabajo de liquidación */
  status: SettlementStatus;
  /** Número de intentos de ejecución realizados */
  attempts: number;
}
