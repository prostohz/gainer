import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import 'dotenv/config';

process.env.VITE_SERVER_PORT = process.env.SERVER_PORT;

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, 'src/client'),
  publicDir: path.resolve(__dirname, 'public'),
  build: {
    outDir: path.resolve(__dirname, 'dist/client'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    open: true,
    port: Number(process.env.CLIENT_PORT),
  },
  css: {
    postcss: './postcss.config.js',
  },
});
