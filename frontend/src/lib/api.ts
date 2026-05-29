import axios from "axios";
const API_BASE = "https://sgm-ferroviario-production.up.railway.app"; // cache-bust: 2026-05-16
export const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  timeout: 15000,
});
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
api.interceptors.request.use((config) => {
  if (config.url && !config.url.endsWith('/') && !config.url.includes('?')) {
    config.url = config.url + '/';
  }
  return config;
});
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const resp = await axios.post(`${API_BASE}/api/v1/auth/refresh`, null, {
            params: { refresh_token: refresh },
          });
          localStorage.setItem("access_token", resp.data.access_token);
          error.config.headers.Authorization = `Bearer ${resp.data.access_token}`;
          return api(error.config);
        } catch {
          localStorage.clear();
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);
export function createTelemetrySocket(assetId: string, onData: (d: any) => void): WebSocket {
  const ws = new WebSocket(`wss://sgm-ferroviario-production.up.railway.app/api/v1/iot/ws/${assetId}`);
  ws.onmessage = (e) => { try { onData(JSON.parse(e.data)); } catch {} };
  return ws;
}

