import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:3000';

export interface SportsbookSelection {
  id: string;
  name: string;
  oddsValue: number;
}

export interface SportsbookMarket {
  id: string;
  type: string;
  status: string;
  selections: SportsbookSelection[];
}

export interface SportsbookEvent {
  id: string;
  matchId: string;
  status: string;
  lockTime: string;
  match: {
    homeTeam: string;
    awayTeam: string;
    homeLogo: string | null;
    awayLogo: string | null;
    startTime: string;
    league: string;
    sport: string;
  };
  markets: SportsbookMarket[];
}

export function useEvents(filters?: {
  sport?: string;
  league?: string;
  status?: string;
}) {
  const [events, setEvents] = useState<SportsbookEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters?.sport) params.set('sport', filters.sport);
      if (filters?.league) params.set('league', filters.league);
      if (filters?.status) params.set('status', filters.status);
      const res = await axios.get(`${API_URL}/events?${params.toString()}`);
      setEvents(res.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters?.sport, filters?.league, filters?.status]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, loading, error, refetch: fetchEvents };
}
