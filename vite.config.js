import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { VitePWA } from 'vite-plugin-pwa';

// base './' keeps every URL relative, so the build runs from any host or sub-path
// (Vercel, Netlify, GitHub Pages /repo-name/, or a plain folder).
const artifact = process.env.VITE_TARGET === 'artifact'; // sandboxed preview build: no service worker

// Version shown in the app (More screen): Vercel's commit SHA, else local git, plus build time.
import { execSync } from 'node:child_process';
const sha = (process.env.VERCEL_GIT_COMMIT_SHA || (() => { try { return execSync('git rev-parse HEAD').toString().trim(); } catch { return 'dev'; } })()).slice(0, 7);

export default defineConfig({
  base: './',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  define: {
    __APP_VERSION__: JSON.stringify(sha),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    tailwindcss(),
    !artifact && VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Learn & Lead',
        short_name: 'Learn & Lead',
        description: 'Exam preparation: WAPDA AEE (Electrical) and more.',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f3f7fa',
        theme_color: '#0b5675',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json,webmanifest}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
});
