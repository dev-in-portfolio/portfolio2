import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  root: '.',
  base: './',
  resolve: {
    alias: {
      '/shared': path.resolve(__dirname, '../../shared'),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      external: (id: string) =>
        id.startsWith('/shared/') && !/\.css(?:[?#]|$)/i.test(id),
    },
  },
});
