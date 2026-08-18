/**
 * RAKSHAK API Client
 * Centralized HTTP client for all backend API calls.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Health ──────────────────────────────────────────────────────────────────
export const api = {
  health: () => request('/health'),

  // ── Soldiers ──────────────────────────────────────────────────────────────
  soldiers: {
    list: () => request('/soldiers'),
    get: (id) => request(`/soldiers/${id}`),
    create: (data) => request('/soldiers', { method: 'POST', body: JSON.stringify(data) }),
    fatigue: (id) => request(`/soldiers/${id}/fatigue`),
    readings: (id, limit = 50) => request(`/soldiers/${id}/readings?limit=${limit}`),
    history: (id) => request(`/soldiers/${id}/history`),
    baseline: (id) => request(`/soldiers/${id}/baseline`),
    alerts: (id) => request(`/soldiers/${id}/alerts`),
  },

  // ── Squads ────────────────────────────────────────────────────────────────
  squads: {
    list: () => request('/squads'),
    get: (id) => request(`/squads/${id}`),
    status: (id) => request(`/squads/${id}/status`),
    create: (data) => request('/squads', { method: 'POST', body: JSON.stringify(data) }),
  },

  // ── Missions ──────────────────────────────────────────────────────────────
  missions: {
    list: () => request('/missions'),
    get: (id) => request(`/missions/${id}`),
    start: (data) => request('/missions/start', { method: 'POST', body: JSON.stringify(data) }),
    end: (id) => request(`/missions/${id}/end`, { method: 'POST' }),
    delete: (id) => request(`/missions/${id}`, { method: 'DELETE' }),
    events: (id) => request(`/missions/${id}/events`),
  },

  // ── Analytics ─────────────────────────────────────────────────────────────
  analytics: {
    squadTrend: (squadId, hours = 24) =>
      request(`/analytics/squad/${squadId}/trend?hours=${hours}`),
    soldierHistory: (soldierId, hours = 24) =>
      request(`/analytics/soldier/${soldierId}/history?hours=${hours}`),
    systemSummary: () => request('/analytics/system/summary'),
  },

  // ── Simulation ────────────────────────────────────────────────────────────
  simulation: {
    status: () => request('/simulation/status'),
    start: () => request('/simulation/start', { method: 'POST' }),
    stop: () => request('/simulation/stop', { method: 'POST' }),
    tick: () => request('/simulation/tick', { method: 'POST' }),
    setScenario: (scenario) => request('/simulation/scenario', { method: 'POST', body: JSON.stringify({ scenario }) }),
  },

  // ── Alerts ────────────────────────────────────────────────────────────────
  alerts: {
    list: (limit = 50, activeOnly = false) => request(`/soldiers/alerts?limit=${limit}&active_only=${activeOnly}`),
    acknowledge: (alertId) =>
      request(`/soldiers/alerts/${alertId}/acknowledge`, { method: 'POST' }),
  },
};

export default api;
