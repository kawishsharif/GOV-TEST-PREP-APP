import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// base './' keeps every URL relative, so the build runs from any host or sub-path
// (Vercel, Netlify, GitHub Pages /repo-name/, or a plain folder).
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
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
