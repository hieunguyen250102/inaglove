import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@shared': fileURLToPath(new URL('../shared', import.meta.url)) },
  },
  server: {
    port: 5173,
    fs: { allow: ['..'] },
    // In dev the Socket.IO server runs on :3001; proxy it so the client can use same-origin.
    proxy: { '/socket.io': { target: 'http://localhost:3001', ws: true } },
  },
});
