import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    // Pre-bundle recharts once to avoid esbuild linker overload / crashes on Windows during HMR.
    include: ['recharts'],
  },
});
