import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer'],
    }),
  ],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      buffer: 'buffer',
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      sourcemap: false,
    },
  },
  build: {
    rollupOptions: {
      onwarn(warning, defaultHandler) {
        if (warning.message.includes('contains an annotation that Rollup cannot interpret')) return;
        defaultHandler(warning);
      },
      output: {
        manualChunks(id) {
          if (id.includes('@cofhe')) return 'cofhe';
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('wagmi') || id.includes('viem')) return 'wallet-core';
          if (id.includes('@walletconnect') || id.includes('@reown') || id.includes('@coinbase') || id.includes('@base-org')) {
            return 'wallet-connectors';
          }
          if (id.includes('@tanstack')) return 'query-vendor';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) return 'react-vendor';
          if (id.includes('buffer')) return 'polyfills';
          return undefined;
        },
      },
    },
  },
  /** CoFHE ships `new Worker(..., { type: 'module' })`; force ES format for worker chunks (Rollup disallows IIFE + split chunks). */
  worker: {
    format: 'es',
    rollupOptions: {
      output: {
        format: 'es',
        inlineDynamicImports: true,
      },
    },
  },
});
