/**
 * @module AdminAPI
 * @description Capa de comunicación con el backend (módulo `admin`).
 * 
 * Intercepta las solicitudes para:
 * 1. Inyectar el token JWT de administración.
 * 2. Redirigir al inicio de sesión si el token expira (401 Unauthorized).
 */
import axios from 'axios';

const API_URL = import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:3005';

const apiClient = axios.create({ baseURL: API_URL });

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

// Stats
export const getStats = () => apiClient.get('/admin/stats').then((r) => r.data);

// Feed
export const getFeedHealth = () => apiClient.get('/admin/feed/health').then((r) => r.data);

// Events
export const getEvents = (params?: Record<string, string>) =>
  apiClient.get('/admin/events', { params }).then((r) => r.data);

export const suspendEvent = (eventId: string, reason: string) =>
  apiClient.patch(`/admin/events/${eventId}/suspend`, { reason }).then((r) => r.data);

export const reactivateEvent = (eventId: string, reason: string) =>
  apiClient.patch(`/admin/events/${eventId}/reactivate`, { reason }).then((r) => r.data);

export const suspendMarket = (marketId: string, reason: string) =>
  apiClient.patch(`/admin/markets/${marketId}/suspend`, { reason }).then((r) => r.data);

export const reactivateMarket = (marketId: string, reason: string) =>
  apiClient.patch(`/admin/markets/${marketId}/reactivate`, { reason }).then((r) => r.data);

// Tickets
export const getTickets = (params?: Record<string, string>) =>
  apiClient.get('/admin/tickets', { params }).then((r) => r.data);

export const getTicket = (ticketId: string) =>
  apiClient.get(`/admin/tickets/${ticketId}`).then((r) => r.data);

export const gradeTicket = (ticketId: string, outcome: string, reason: string) =>
  apiClient.patch(`/admin/tickets/${ticketId}/grade`, { outcome, reason }).then((r) => r.data);

export const voidTicket = (ticketId: string, reason: string) =>
  apiClient.patch(`/admin/tickets/${ticketId}/void`, { reason }).then((r) => r.data);

// Settlements
export const getSettlements = (params?: Record<string, string>) =>
  apiClient.get('/admin/settlements', { params }).then((r) => r.data);

export const getSettlementStats = () =>
  apiClient.get('/admin/settlements/stats').then((r) => r.data);

export const retrySettlement = (jobId: string, reason: string) =>
  apiClient.post(`/admin/settlements/${jobId}/retry`, { reason }).then((r) => r.data);

// Audit
export const getAuditLogs = (params?: Record<string, string>) =>
  apiClient.get('/admin/audit', { params }).then((r) => r.data);

// Market odds (Fase 4)
export const setMarketOdds = (
  marketId: string,
  legs: Array<{ selectionId: string; oddsValue: number }>,
  reason: string,
) =>
  apiClient
    .patch(`/admin/markets/${marketId}/odds`, { legs, reason })
    .then((r) => r.data);

// Promotions (Fase 4)
export const listPromotions = (status?: string) =>
  apiClient
    .get('/admin/promotions', { params: status ? { status } : {} })
    .then((r) => r.data);

export const createPromotion = (payload: any) =>
  apiClient.post('/admin/promotions', payload).then((r) => r.data);

export const pausePromotion = (id: string, reason: string) =>
  apiClient
    .patch(`/admin/promotions/${id}/pause`, { reason })
    .then((r) => r.data);

export const activatePromotion = (id: string, reason: string) =>
  apiClient
    .patch(`/admin/promotions/${id}/activate`, { reason })
    .then((r) => r.data);

export const getPromotionRedemptions = (id: string) =>
  apiClient.get(`/admin/promotions/${id}/redemptions`).then((r) => r.data);
