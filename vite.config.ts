import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Lokal liegt die App unter „/“. Für GitHub Pages setzt der Workflow
// BASE_PATH=/projekte/, weil die Seite dort in einem Unterordner liegt.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      // Neue Versionen werden nie automatisch geladen, sondern die App zeigt
      // einen Hinweis „Neu laden“ (siehe src/Aktualisierung.tsx).
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon.svg'],
      manifest: {
        name: 'Projekte',
        short_name: 'Projekte',
        description: 'Was jetzt und bald wichtig ist: Termine, Aufgaben und Vorhaben in einer Liste.',
        lang: 'de',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#fbfbfa',
        theme_color: '#fbfbfa',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    port: 5280,
    strictPort: true,
  },
});
