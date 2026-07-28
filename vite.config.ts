import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://v2.tauri.app/start/frontend/vite/
const isTauriDev = !!process.env.TAURI_ENV_PLATFORM;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },

  // Vite options tailored for Tauri development, matching the desktop shell's
  // expectations (tauri.conf.json -> build.devUrl / build.frontendDist).
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      // Don't trigger a frontend reload when the Rust build writes to target/
      ignored: ['**/src-tauri/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  build: {
    // Tauri uses Chromium on Windows/Linux and WebKit on macOS
    target: isTauriDev ? (process.platform === 'win32' ? 'chrome105' : 'safari13') : 'modules',
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
});