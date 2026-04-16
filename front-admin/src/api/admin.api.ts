import axios, { type AxiosInstance } from 'axios';

const API_URL = import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:3005';

function getClient(): AxiosInstance {
  const token = localStorage.getItem('admin_token');
  const client = axios.create({
    baseURL: API_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  client.interceptors.response.use(
    (r) => r,
    (err) => {
      if (err.response?.status === 401) {
        localStorage.removeItem('admin_token');
        window.location.href = '/';
      }
      return Promise.reject(err);
    },
  );
  return client;
}

// Stats
export const getStats = () => getClient().get('/admin/stats').then((r) => r.data);

// Feed
export const getFeedHealth = () => getClient().get('/admin/feed/health').then((r) => r.data);

// Events
export const getEvents = (params?: Record<string, string>) =>
  getClient().get('/admin/events', { params }).then((r) => r.data);

export const suspendEvent = (eventId: string, reason: string) =>
  getClient().patch(`/admin/events/${eventId}/suspend`, { reason }).then((r) => r.data);

export const reactivateEvent = (eventId: string, reason: string) =>
  getClient().patch(`/admin/events/${eventId}/reactivate`, { reason }).then((r) => r.data);

export const suspendMarket = (marketId: string, reason: string) =>
  getClient().patch(`/admin/markets/${marketId}/suspend`, { reason }).then((r) => r.data);

export const reactivateMarket = (marketId: string, reason: string) =>
  getClient().patch(`/admin/markets/${marketId}/reactivate`, { reason }).then((r) => r.data);

// Tickets
export const getTickets = (params?: Record<string, string>) =>
  getClient().get('/admin/tickets', { params }).then((r) => r.data);

export const getTicket = (ticketId: string) =>
  getClient().get(`/admin/tickets/${ticketId}`).then((r) => r.data);

export const gradeTicket = (ticketId: string, outcome: string, reason: string) =>
  getClient().patch(`/admin/tickets/${ticketId}/grade`, { outcome, reason }).then((r) => r.data);

export const voidTicket = (ticketId: string, reason: string) =>
  getClient().patch(`/admin/tickets/${ticketId}/void`, { reason }).then((r) => r.data);

// Settlements
export const getSettlements = (params?: Record<string, string>) =>
  getClient().get('/admin/settlements', { params }).then((r) => r.data);

export const getSettlementStats = () =>
  getClient().get('/admin/settlements/stats').then((r) => r.data);

export const retrySettlement = (jobId: string, reason: string) =>
  getClient().post(`/admin/settlements/${jobId}/retry`, { reason }).then((r) => r.data);

// Audit
export const getAuditLogs = (params?: Record<string, string>) =>
  getClient().get('/admin/audit', { params }).then((r) => r.data);

// Market odds (Fase 4)
export const setMarketOdds = (
  marketId: string,
  legs: Array<{ selectionId: string; oddsValue: number }>,
  reason: string,
) =>
  getClient()
    .patch(`/admin/markets/${marketId}/odds`, { legs, reason })
    .then((r) => r.data);

// Promotions (Fase 4)
export const listPromotions = (status?: string) =>
  getClient()
    .get('/admin/promotions', { params: status ? { status } : {} })
    .then((r) => r.data);

export const createPromotion = (payload: any) =>
  getClient().post('/admin/promotions', payload).then((r) => r.data);

export const pausePromotion = (id: string, reason: string) =>
  getClient()
    .patch(`/admin/promotions/${id}/pause`, { reason })
    .then((r) => r.data);

export const activatePromotion = (id: string, reason: string) =>
  getClient()
    .patch(`/admin/promotions/${id}/activate`, { reason })
    .then((r) => r.data);

export const getPromotionRedemptions = (id: string) =>
  getClient().get(`/admin/promotions/${id}/redemptions`).then((r) => r.data);
