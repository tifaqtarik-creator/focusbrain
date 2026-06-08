import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',     // écoute IPv4 + IPv6 (localhost ET 127.0.0.1 marchent)
    strictPort: false,
    proxy: {
      '/api': { target: 'http://127.0.0.1:3001', changeOrigin: true },
      '/socket.io': { target: 'http://127.0.0.1:3001', changeOrigin: true, ws: true },
    },
  },
  optimizeDeps: {
    include: ['maplibre-gl'],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('maplibre-gl') || id.includes('react-map-gl')) return 'map';
            if (id.includes('framer-motion'))    return 'animation';
            if (id.includes('@fullcalendar'))    return 'calendar';
            if (id.includes('@livekit'))         return 'livekit';
            if (id.includes('react-dom'))        return 'vendor';
          }
        },
      },
    },
  },
});
