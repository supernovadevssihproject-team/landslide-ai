const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    throw new Error(`Map API request failed: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as T;
}

export interface MapBounds { north?: number; south?: number; east?: number; west?: number; }

export const MapApi = {
  async getRiskPolygons(state?: string): Promise<any> {
    const params = new URLSearchParams();
    if (state && state !== 'all') params.set('state', state);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchJson(`/api/map/risk-polygons${qs}`);
  },

  async getBoundaries(level = 'state', state?: string): Promise<any> {
    const params = new URLSearchParams();
    params.set('level', level);
    if (state && state !== 'all') params.set('state', state);
    return fetchJson(`/api/map/boundaries?${params.toString()}`);
  },

  async getReports(state?: string): Promise<any> {
    const params = new URLSearchParams();
    if (state && state !== 'all') params.set('state', state);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchJson(`/api/map/reports${qs}`);
  },
};
