import { defineConfig } from 'vite';
import path from 'path';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  root: '.',
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    target: 'esnext',
    sourcemap: false,
  },
  plugins: [
    glsl(),
    {
      name: 'helios-webgpu-fallback',
      transformIndexHtml() {
        return [
          {
            tag: 'script',
            attrs: {
              src: '/shared/webgpu-canvas-fallback.js',
              'data-nexus-fallback': 'helios',
            },
            injectTo: 'head-prepend',
          },
        ];
      },
    },
  ],
});
