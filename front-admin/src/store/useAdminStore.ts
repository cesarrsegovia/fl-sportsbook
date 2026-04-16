import { create } from 'zustand';

interface AdminState {
  token: string | null;
  username: string | null;
  stats: any | null;
  manualReviewCount: number;
  settlementFailedCount: number;

  setAuth: (token: string, username: string) => void;
  logout: () => void;
  setStats: (stats: any) => void;
  incrementManualReviewCount: () => void;
  incrementSettlementFailedCount: () => void;
  updateTicketInList: (ticketId: string, status: string) => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  token: localStorage.getItem('admin_token'),
  username: localStorage.getItem('admin_username'),
  stats: null,
  manualReviewCount: 0,
  settlementFailedCount: 0,

  setAuth: (token, username) => {
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_username', username);
    set({ token, username });
  },

  logout: () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_username');
    set({ token: null, username: null });
  },

  setStats: (stats) =>
    set({
      stats,
      manualReviewCount: stats?.tickets?.manualReviewPending ?? 0,
      settlementFailedCount: stats?.settlements?.manualInterventionCount ?? 0,
    }),

  incrementManualReviewCount: () =>
    set((s) => ({ manualReviewCount: s.manualReviewCount + 1 })),

  incrementSettlementFailedCount: () =>
    set((s) => ({ settlementFailedCount: s.settlementFailedCount + 1 })),

  updateTicketInList: (_ticketId, _status) => {
    // placeholder for real-time WS updates
  },
}));
