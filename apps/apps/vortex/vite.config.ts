import { defineConfig } from 'vite'
import path from 'node:path'

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '/shared': path.resolve(__dirname, '../../shared'),
    },
  },
  build: {
    rollupOptions: {
      external: (id: string) =>
        id.startsWith('/shared/') && !/\.css(?:[?#]|$)/i.test(id),
    },
  },
})
