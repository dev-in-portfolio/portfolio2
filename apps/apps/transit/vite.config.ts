import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      external: (id: string) =>
        id.startsWith('/shared/') || id.startsWith('../../'),
    },
  },
});
