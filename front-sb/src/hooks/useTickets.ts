import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:3000';
const TRANSITIONAL_STATUSES = ['SUBMITTED', 'CONFIRMING', 'CONFIRMED', 'WON', 'SETTLING'];

export interface Ticket {
  id: string;
  quoteId: string;
  userId: string;
  txHash: string | null;
  blockNumber: number | null;
  confirmedAt: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  quote?: any;
}

export function useTickets(userId: string | null) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTickets = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/tickets?userId=${userId}`);
      setTickets(res.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchTicket = useCallback(async (ticketId: string): Promise<Ticket | null> => {
    try {
      const res = await axios.get(`${API_URL}/tickets/${ticketId}`);
      return res.data;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetchTickets();
  }, [fetchTickets, userId]);

  // Poll every 10s while there are transitional tickets
  useEffect(() => {
    const hasTransitional = tickets.some((t) =>
      TRANSITIONAL_STATUSES.includes(t.status),
    );
    if (hasTransitional && !pollRef.current) {
      pollRef.current = setInterval(fetchTickets, 10000);
    } else if (!hasTransitional && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [tickets, fetchTickets]);

  const updateTicketStatus = useCallback(
    (ticketId: string, status: string) => {
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status } : t)),
      );
    },
    [],
  );

  return { tickets, loading, fetchTickets, fetchTicket, updateTicketStatus };
}
