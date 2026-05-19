import axios from 'axios';

const api = axios.create({
  baseURL: '/',
  withCredentials: true,         // send HttpOnly refresh-token cookie on /api/auth/*
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor — attach Bearer token ────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor — auto-refresh on 401 ───────────────────────────────
// When any request (except login/refresh) returns 401, we attempt a silent
// token refresh using the HttpOnly refresh-token cookie, then replay the
// original request. If refresh also fails the user is redirected to /login.
let _refreshPromise = null; // deduplicate concurrent refresh requests

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    const is401 = err.response?.status === 401;
    const isAuthEndpoint =
      originalRequest.url?.includes('/api/auth/refresh') ||
      originalRequest.url?.includes('/api/auth/login');

    if (is401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      // Deduplicate: if a refresh is already in-flight, wait for it
      if (!_refreshPromise) {
        _refreshPromise = api
          .post('/api/auth/refresh')
          .finally(() => { _refreshPromise = null; });
      }

      try {
        const res = await _refreshPromise;
        const newToken = res.data.access_token;
        localStorage.setItem('token', newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);   // replay original request
      } catch (refreshErr) {
        localStorage.removeItem('token');
        // Avoid redirect loop on /api/auth/me (initial auth check)
        if (!originalRequest.url?.includes('/api/auth/me')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(err);
  }
);

export default api;
