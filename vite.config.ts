import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Custom plugin to remove crossorigin attribute for Electron
const removeCrossorigin = () => {
  return {
    name: 'remove-crossorigin',
    transformIndexHtml(html: string) {
      return html.replace(/ crossorigin/g, '');
    },
  };
};

export default defineConfig({
  base: './', // Use relative paths for Electron
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react(), removeCrossorigin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    modulePreload: {
      polyfill: false,
    },
  },
});
