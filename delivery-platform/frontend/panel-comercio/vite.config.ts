import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
  define: { __DELIVERY_CONFIG__: JSON.stringify({
    apiBaseUrl: env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1',
    trackingUrl: env.VITE_TRACKING_URL || 'ws://localhost:8080/ws/',
    trackingDirectUrl: env.VITE_TRACKING_DIRECT_URL || 'ws://localhost:4001',
    osrmUrl: env.VITE_OSRM_URL || 'http://localhost:5001',
    merchantId: env.VITE_MERCHANT_ID || '',
    refreshEnabled: env.VITE_AUTH_REFRESH_ENABLED === 'true',
    demosEnabled: env.VITE_ENABLE_DEMOS === 'true' || (mode === 'development' && env.VITE_ENABLE_DEMOS !== 'false'),
  }) },
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
