import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import devtools from 'solid-devtools/vite';

export default defineConfig({
  plugins: [devtools(), solidPlugin(), tailwindcss()],
  server: {
    port: 3077,
    host: '0.0.0.0',
    allowedHosts: ['finlyzen.ercloud.site'],
  },
  build: {
    target: 'esnext',
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: ['finlyzen.ercloud.site'],
  }
});
