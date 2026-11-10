import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  // Build id appended to data URLs (src/data/dataUrl.ts) so a deploy never
  // pairs new code with data cached from the previous one.
  define: { __DATA_VERSION__: JSON.stringify(Date.now().toString(36)) },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    allowedHosts: ['.ngrok-free.app', '.ngrok.app', '.ngrok.io'],
  },
});
