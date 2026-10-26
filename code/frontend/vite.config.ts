import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development (npm run dev) the site runs on http://localhost:5173 and the
// backend on http://localhost:3000. The proxy forwards /api and /socket.io to
// the backend, so the browser only ever talks to one address — exactly like
// production, where the backend serves the built site itself.
const backend = 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': backend,
      '/socket.io': { target: backend, ws: true },
    },
  },
});
