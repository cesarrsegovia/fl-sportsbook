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
