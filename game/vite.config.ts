import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: {
    // Rapier embeds its WASM in its own JS chunk (~4.3 MB, 1.6 MB gzipped); the rest is split off so it caches
    // separately.
    chunkSizeWarningLimit: 4500,
    rollupOptions: {
      output: {
        manualChunks: { rapier: ['@dimforge/rapier3d-compat'], three: ['three'], react: ['react', 'react-dom'] },
      },
    },
  },
});
