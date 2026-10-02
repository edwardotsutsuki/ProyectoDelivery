import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
  define: { __TRACKING_CONFIG__: JSON.stringify({ trackingUrl: env.VITE_TRACKING_URL || 'ws://localhost:8080/ws/', osrmUrl: env.VITE_OSRM_URL || 'http://localhost:5001' }) },
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    watch: {
      usePolling: true,
    },
  },
  };
});

