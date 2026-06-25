import { defineConfig } from 'vite';
export default defineConfig({
  root: '.', base: './',
  build: { outDir: 'dist', target: 'esnext', sourcemap: true },
  assetsInclude: ['**/*.wgsl'],
});
