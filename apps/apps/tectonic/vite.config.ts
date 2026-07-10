import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  build: { outDir: 'dist', target: 'esnext', sourcemap: true },
  plugins: [
    {
      name: 'tectonic-webgpu-fallback',
      transformIndexHtml() {
        return [
          {
            tag: 'script',
            attrs: {
              src: '/shared/webgpu-canvas-fallback.js',
              'data-nexus-fallback': 'tectonic',
            },
            injectTo: 'head-prepend',
          },
        ];
      },
    },
  ],
});
