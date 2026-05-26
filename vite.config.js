import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Port can be 5173 or 5174 depending on what is free.
    // The backend CORS now allows BOTH ports, so either works.
    port: 5174,
    strictPort: false, // allow fallback to next free port
    proxy: {
      // ── SSE stream — must NOT timeout, keep-alive required ──────────────
      // IMPORTANT: EventSource cannot send Authorization headers, so the
      // frontend appends the token as a query param: /api/scan/stream/42?token=…
      // The proxy transparently forwards the full URL including ?token= to the backend.
      '/api/scan/stream': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
        ws: false,
        proxyTimeout: 0,   // never timeout the SSE connection
        timeout: 0,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Forward cookie header if present (withCredentials fallback)
            const cookie = req.headers['cookie'];
            if (cookie) proxyReq.setHeader('Cookie', cookie);
            // Forward Authorization header if present (axios/fetch calls)
            const auth = req.headers['authorization'];
            if (auth) proxyReq.setHeader('Authorization', auth);
          });
          proxy.on('error', (err, req, res) => {
            console.error('[vite proxy SSE error]', err.message);
          });
        },
      },

      // ── All other /api routes ─────────────────────────────────────────
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Forward cookie header if present
            const cookie = req.headers['cookie'];
            if (cookie) proxyReq.setHeader('Cookie', cookie);
            // Forward Authorization header if present
            const auth = req.headers['authorization'];
            if (auth) proxyReq.setHeader('Authorization', auth);
          });
          proxy.on('error', (err, req, res) => {
            console.error('[vite proxy error]', err.message);
            if (!res.headersSent) {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ detail: 'Backend unreachable. Is uvicorn running on port 8000?' }));
            }
          });
        },
      },
    },
  },
})
