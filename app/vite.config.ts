import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Rutas relativas para que funcione dentro de una subcarpeta de GitHub Pages.
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Pedidos 3D',
        short_name: 'Pedidos 3D',
        description: 'Pedidos, costos y gastos de impresiones 3D',
        lang: 'es',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#e9ece6',
        theme_color: '#0e6b66',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        runtimeCaching: [
          {
            // Fuentes de Google: casi nunca cambian.
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: { cacheName: 'fuentes', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            // Datos: primero la red; sin conexión, lo último que se cargó (solo lectura).
            urlPattern: ({ url, request }) =>
              url.origin === 'https://ydugevaqupmpwwabwxno.supabase.co' && url.pathname.startsWith('/rest/v1/') && request.method === 'GET',
            handler: 'NetworkFirst',
            options: { cacheName: 'datos', networkTimeoutSeconds: 6, expiration: { maxEntries: 60 } },
          },
        ],
      },
    }),
  ],
})
