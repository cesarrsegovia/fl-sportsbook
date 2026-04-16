export interface TeamRanking {
    id: string;
    league: string;
    conference: string;
    teamName: string;
    teamAbbr: string;
    teamLogo?: string | null;
    wins: number;
    losses: number;
    gamesBehind: number;
    streak: string | null;
    seed: number;
    pct: number;
}

export interface PeriodScore {
    period: number;
    value: number;
}

export interface Match {
    id: string;
    homeTeam: string;
    awayTeam: string;
    homeLogo?: string | null;
    awayLogo?: string | null;
    homeScore: number;
    awayScore: number;
    status: string;
    currentClock: string | null;
    startTime?: string | Date;
    league?: string;
    homeLinescores?: PeriodScore[];
    awayLinescores?: PeriodScore[];
    leaders?: {
        name: string;
        value: string;
        athlete: {
            displayName: string;
            headshot?: string;
            position?: string;
        }
    }[];
}

export interface Odds {
    matchId: string;
    provider?: string | null;
    homeWin: number | null;
    awayWin: number | null;
    draw?: number | null;
}

export interface MatchUpdate extends Partial<Match> {
    id: string;
}

export interface WebSocketMessage {
    type: 'MATCH_UPDATE' | 'ODDS_UPDATE' | 'STANDINGS_UPDATE';
    data: any;
}

// ─── Sportsbook Types (Fase 1–3) ─────────────────────────────────────────────

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

export type GradeOutcome = 'WIN' | 'LOSS' | 'VOID' | 'REFUND' | 'MANUAL_REVIEW';

export type SettlementStatus =
  | 'PENDING'
  | 'SUBMITTED'
  | 'CONFIRMED'
  | 'FAILED'
  | 'MANUAL_INTERVENTION';

export interface SportsbookEvent {
  id: string;
  matchId: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED' | 'FINISHED';
  lockTime: string | Date;
  feedFreshAt?: string | Date | null;
}

export interface Market {
  id: string;
  eventId: string;
  type: 'MATCH_WINNER' | 'OVER_UNDER';
  status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
  selections?: Selection[];
}

export interface Selection {
  id: string;
  marketId: string;
  name: string;
  oddsValue: number;
}

export interface Quote {
  id: string;
  selectionId: string;
  userId: string;
  stake: number;
  oddsAtQuote: number;
  expectedPayout: number;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REJECTED';
  txParams?: Record<string, unknown> | null;
  expiresAt: string | Date;
  createdAt: string | Date;
}

export interface Ticket {
  id: string;
  quoteId: string;
  userId: string;
  txHash?: string | null;
  blockNumber?: number | null;
  confirmedAt?: string | Date | null;
  status: TicketStatus;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface GradingRecord {
  id: string;
  ticketId: string;
  outcome: GradeOutcome;
  resultSource: string;
  gradedAt: string | Date;
  gradedBy: string;
  notes?: string | null;
}

export interface SettlementJob {
  id: string;
  ticketId: string;
  idempotencyKey: string;
  amount: number;
  toWallet: string;
  txHash?: string | null;
  status: SettlementStatus;
  attempts: number;
}
