import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    // three.js (Renderer + Shader-Pipeline) hat allein ~530 kB (Namespace-Import wird bereits getree-shaked); eigener Chunk, Schwelle knapp darüber.
    chunkSizeWarningLimit: 560,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('/src/core/') || id.includes('/src/i18n/')) return 'core';
          if (id.includes('/src/ui/') || id.includes('/src/view/')) return 'ui';
          return undefined;
        },
      },
    },
  },
  server: { host: true },
  test: {
    include: ['tests/**/*.test.ts'],
  },
} as Parameters<typeof defineConfig>[0]);
