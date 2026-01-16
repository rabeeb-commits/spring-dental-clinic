import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    host: true, // Listen on all network interfaces
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});



