import { create } from 'zustand'
import type { Match, Odds, TeamRanking } from '@sportsbook/shared-types'
import en from '../locales/en.json'
import de from '../locales/de.json'
import fr from '../locales/fr.json'

const locales: Record<string, any> = { en, de, fr };

export interface Bet {
    id: string;
    matchId: string;
    selectionId: string; // UUID de Selection en DB
    selection: 'home' | 'away' | 'draw';
    oddsValue: number;
    matchText: string;
    selectionText: string;
}

export type BetSlipMode = 'single' | 'parlay';

export interface QuoteLegResponse {
    selectionId: string;
    matchHomeTeam: string;
    matchAwayTeam: string;
    selectionName: string;
    oddsValue: number;
}

export interface QuoteResponseDto {
    quoteId: string;
    type?: 'SINGLE' | 'PARLAY';
    selectionId?: string;
    stake: number;
    oddsAtQuote: number;
    expectedPayout: number;
    expiresAt: string;
    ttlSeconds: number;
    txParams: {
        to: string;
        value: string;
        data: string;
        quoteId: string;
    };
    match?: {
        homeTeam: string;
        awayTeam: string;
        startTime: Date;
        league: string;
    };
    selection?: {
        name: string;
        oddsValue: number;
    };
    legs?: QuoteLegResponse[];
    isFreeBet?: boolean;
    freeBetAmount?: number;
}

interface SportsStore {
    matches: Match[];
    standings: TeamRanking[];
    odds: Record<string, Odds>;
    selectedMatchId: string | null;
    selectedSport: string;
    selectedSection: 'home' | 'sportsbook' | 'games' | 'profile' | 'mybets';
    language: 'en' | 'de' | 'fr';
    bets: Bet[];
    isBetSlipOpen: boolean;
    betSlipMode: BetSlipMode;
    // Wallet & quote
    walletAddress: string | null;
    activeQuote: QuoteResponseDto | null;
    isQuoteModalOpen: boolean;
    userTickets: any[];
    ticketStatusMap: Record<string, string>;
    t: (key: string) => string;
    setMatches: (matches: Match[]) => void;
    setStandings: (standings: TeamRanking[]) => void;
    updateMatch: (match: Partial<Match> & { id: string }) => void;
    updateOdds: (odds: Odds) => void;
    setSelectedMatchId: (id: string | null) => void;
    setSelectedSport: (sport: string) => void;
    setSelectedSection: (section: 'home' | 'sportsbook' | 'games' | 'profile' | 'mybets') => void;
    setLanguage: (lang: 'en' | 'de' | 'fr') => void;
    addBet: (bet: Omit<Bet, 'id'>) => void;
    removeBet: (id: string) => void;
    toggleBetSlip: (isOpen?: boolean) => void;
    clearBets: () => void;
    setBetSlipMode: (mode: BetSlipMode) => void;
    // Wallet & quote actions
    setWalletAddress: (address: string | null) => void;
    setActiveQuote: (quote: QuoteResponseDto | null) => void;
    setQuoteModalOpen: (open: boolean) => void;
    setUserTickets: (tickets: any[]) => void;
    updateTicketStatus: (ticketId: string, status: string) => void;
}

export const useStore = create<SportsStore>((set, get) => ({
    matches: [],
    standings: [],
    odds: {},
    selectedMatchId: null,
    selectedSport: 'NBA',
    selectedSection: 'sportsbook',
    language: (localStorage.getItem('user_lang') as any) || 'en',
    bets: [],
    isBetSlipOpen: false,
    betSlipMode: 'single',
    walletAddress: null,
    activeQuote: null,
    isQuoteModalOpen: false,
    userTickets: [],
    ticketStatusMap: {},
    t: (key: string) => {
        const lang = get().language;
        const messages = locales[lang] || locales['en'];
        return messages[key]?.message || key;
    },
    setMatches: (matches) => set({ matches }),
    setStandings: (standings) => set({ standings }),
    updateMatch: (updatedMatch) => set((state) => ({
        matches: state.matches.map((m) =>
            m.id === updatedMatch.id ? { ...m, ...updatedMatch } : m
        )
    })),
    updateOdds: (newOdds) => set((state) => ({
        odds: { ...state.odds, [newOdds.matchId]: newOdds }
    })),
    setSelectedMatchId: (id) => set({ selectedMatchId: id }),
    setSelectedSport: (sport) => set({ selectedSport: sport, selectedMatchId: null }),
    setSelectedSection: (section) => set({ selectedSection: section, selectedMatchId: null }),
    setLanguage: (lang) => {
        localStorage.setItem('user_lang', lang);
        set({ language: lang });
    },
    addBet: (bet) => set((state) => {
        if (state.betSlipMode === 'parlay') {
            // Parlay: append; skip if same match already present or same selection already present
            const alreadySelection = state.bets.some(b => b.selectionId === bet.selectionId);
            if (alreadySelection) return {};
            if (state.bets.length >= 8) return { isBetSlipOpen: true };
            return {
                bets: [...state.bets, { ...bet, id: Math.random().toString(36).substring(2, 9) }],
                isBetSlipOpen: true,
            };
        }
        // v1 single: replace any existing bet
        return {
            bets: [{ ...bet, id: Math.random().toString(36).substring(2, 9) }],
            isBetSlipOpen: true,
        };
    }),
    removeBet: (id) => set((state) => ({
        bets: state.bets.filter(b => b.id !== id)
    })),
    toggleBetSlip: (isOpen) => set((state) => ({
        isBetSlipOpen: isOpen !== undefined ? isOpen : !state.isBetSlipOpen
    })),
    clearBets: () => set({ bets: [], isBetSlipOpen: false }),
    setBetSlipMode: (mode) => set((state) => {
        // Switching to single: keep only last bet
        if (mode === 'single' && state.bets.length > 1) {
            return { betSlipMode: mode, bets: state.bets.slice(-1) };
        }
        return { betSlipMode: mode };
    }),
    // Wallet & quote
    setWalletAddress: (address) => set({ walletAddress: address }),
    setActiveQuote: (quote) => set({ activeQuote: quote }),
    setQuoteModalOpen: (open) => set({ isQuoteModalOpen: open }),
    setUserTickets: (tickets) => set({ userTickets: tickets }),
    updateTicketStatus: (ticketId, status) => set((state) => ({
        ticketStatusMap: { ...state.ticketStatusMap, [ticketId]: status }
    })),
}))
