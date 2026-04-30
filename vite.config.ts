import react from '@vitejs/plugin-react';
import UnoCSS from '@unocss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), UnoCSS()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  preview: {
    host: '127.0.0.1',
    port: 8100,
  },
});
