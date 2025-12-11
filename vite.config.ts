/**
 * Vite Configuration for Electron Renderer
 *
 * Configures Vite to build the React frontend for the Electron renderer process.
 * Output goes to dist/gui/ which is loaded by the Electron main process.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'src/gui',
  base: './',
  build: {
    outDir: '../../dist/gui',
    emptyDirOnBuild: true,
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/gui'),
      '@api': path.resolve(__dirname, 'src/api'),
    },
  },
  server: {
    port: 5173,
  },
});
