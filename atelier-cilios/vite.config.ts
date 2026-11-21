import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // As fotografias publicas ficam em client/public (nao na raiz).
  publicDir: 'client/public',
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:3001',
      '/uploads': 'http://127.0.0.1:3001'
    }
  },
  build: { outDir: 'dist' }
});
